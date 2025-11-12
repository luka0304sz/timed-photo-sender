# Rozwiązywanie Problemów z Timerami w React/React Native

## 🐛 Problem: Nieskończone Restarty setInterval/setTimeout

### Symptomy

Jeśli widzisz w logach:
```
[Timer] Starting...
[Timer] Starting...  // 50ms później
[Timer] Starting...  // znowu!
[Timer] Starting...  // i znowu!
```

Lub zauważasz:
- ⚠️ Timer restartuje się setki razy zamiast raz
- ⚠️ Callback odpala się co kilkadziesiąt ms zamiast sekund
- ⚠️ Aplikacja wysyła requesty w pętli (DDOS własnego serwera)
- ⚠️ Wysokie zużycie CPU/baterii
- ⚠️ React renderuje komponenty w kółko

### Przyczyna

**Niestabilne referencje w dependency array `useEffect`**

```typescript
// ❌ PROBLEM - każdy render tworzy nowe obiekty/funkcje
useEffect(() => {
  const interval = setInterval(() => {
    doSomething(data);  // `data` jest nowy obiekt przy każdym renderze
  }, 1000);

  return () => clearInterval(interval);
}, [data]);  // useEffect uruchamia się za każdym razem gdy `data` się "zmienia"
```

**Co się dzieje:**
1. Komponent renderuje się → tworzy nowy obiekt `data`
2. useEffect widzi "nowy" `data` → restartuje timer
3. Timer odpala callback → zmienia state
4. State change → komponent renderuje się
5. **GOTO krok 1** → nieskończona pętla 🔁

---

## ✅ Rozwiązania

### 1. Stabilne Obiekty z `useMemo`

**Problem:**
```typescript
// ❌ ZŁE - nowy obiekt przy każdym renderze
const uploadData = {
  orderNumber,
  warehouseId,
  operator,
};

useEffect(() => {
  const interval = setInterval(() => {
    upload(uploadData);  // uploadData jest "nowy" przy każdym renderze
  }, 1000);
  return () => clearInterval(interval);
}, [uploadData]);  // ⚠️ useEffect uruchamia się za każdym razem!
```

**Rozwiązanie:**
```typescript
// ✅ DOBRE - ten sam obiekt dopóki wartości się nie zmienią
const uploadData = useMemo(
  () => ({
    orderNumber,
    warehouseId,
    operator,
  }),
  [orderNumber, warehouseId, operator]  // tylko te wartości są w deps
);

useEffect(() => {
  const interval = setInterval(() => {
    upload(uploadData);  // uploadData jest stabilny
  }, 1000);
  return () => clearInterval(interval);
}, [uploadData]);  // ✅ useEffect uruchamia się tylko gdy faktycznie zmienią się wartości
```

### 2. Stabilne Funkcje z `useCallback`

**Problem:**
```typescript
// ❌ ZŁE - nowa funkcja przy każdym renderze
const onSuccess = (msg) => {
  console.log(msg);
};

const onError = (err) => {
  console.error(err);
};

useEffect(() => {
  const interval = setInterval(() => {
    doSomething(onSuccess, onError);
  }, 1000);
  return () => clearInterval(interval);
}, [onSuccess, onError]);  // ⚠️ nowe funkcje = restart timera!
```

**Rozwiązanie:**
```typescript
// ✅ DOBRE - te same funkcje przy każdym renderze
const onSuccess = useCallback((msg) => {
  console.log(msg);
}, []);  // puste deps = funkcja nigdy się nie zmienia

const onError = useCallback((err) => {
  console.error(err);
}, []);

useEffect(() => {
  const interval = setInterval(() => {
    doSomething(onSuccess, onError);
  }, 1000);
  return () => clearInterval(interval);
}, [onSuccess, onError]);  // ✅ stabilne referencje
```

### 3. Refs dla Wartości Aktualnych

**Problem:**
```typescript
// ❌ ZŁE - nie można włożyć wszystkiego do deps
const [count, setCount] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    console.log(count);  // zawsze loguje starą wartość!
  }, 1000);
  return () => clearInterval(interval);
}, []);  // puste deps = closure na starą wartość
```

**Rozwiązanie:**
```typescript
// ✅ DOBRE - ref trzyma aktualną wartość
const [count, setCount] = useState(0);
const countRef = useRef(count);

// Aktualizuj ref przy każdej zmianie
useEffect(() => {
  countRef.current = count;
}, [count]);

useEffect(() => {
  const interval = setInterval(() => {
    console.log(countRef.current);  // ✅ zawsze aktualna wartość!
  }, 1000);
  return () => clearInterval(interval);
}, []);  // puste deps = timer startuje raz
```

### 4. Callback w useCallback z Refs

**Kompletny przykład:**

```typescript
const [data, setData] = useState({ foo: 'bar' });
const [apiUrl, setApiUrl] = useState('http://api.com');

// Refs dla wartości które mogą się zmieniać
const dataRef = useRef(data);
const apiUrlRef = useRef(apiUrl);

// Aktualizuj refs
useEffect(() => {
  dataRef.current = data;
  apiUrlRef.current = apiUrl;
}, [data, apiUrl]);

// ✅ Stabilny callback używający refs
const processData = useCallback(async () => {
  const response = await fetch(apiUrlRef.current, {
    method: 'POST',
    body: JSON.stringify(dataRef.current),
  });
  return response.json();
}, []);  // puste deps = funkcja nigdy się nie zmienia!

// ✅ useEffect uruchamia się TYLKO raz
useEffect(() => {
  const interval = setInterval(() => {
    processData();
  }, 5000);

  return () => clearInterval(interval);
}, [processData]);  // processData nigdy się nie zmienia
```

---

## 🎯 Kompletny Przykład: Timer z Wszystkimi Technikami

```typescript
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface TimerConfig {
  intervalSeconds: number;
  isActive: boolean;
  apiUrl: string;
  data: { name: string; value: number };
}

const useTimer = ({
  intervalSeconds,
  isActive,
  apiUrl,
  data,
  onTick,
  onError,
}: TimerConfig & {
  onTick: () => Promise<void>;
  onError: (error: string) => void;
}) => {
  // 1. Stabilny obiekt z useMemo
  const configData = useMemo(
    () => ({
      name: data.name,
      value: data.value,
    }),
    [data.name, data.value]
  );

  // 2. Refs dla wartości które mogą się zmieniać
  const configRef = useRef(configData);
  const apiUrlRef = useRef(apiUrl);

  // Aktualizuj refs
  useEffect(() => {
    configRef.current = configData;
    apiUrlRef.current = apiUrl;
  }, [configData, apiUrl]);

  // 3. Stabilny callback używający refs
  const executeTask = useCallback(async () => {
    try {
      const response = await fetch(apiUrlRef.current, {
        method: 'POST',
        body: JSON.stringify(configRef.current),
      });

      if (!response.ok) throw new Error('Request failed');

      await onTick();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [onTick, onError]);  // tylko stabilne callbacki w deps

  // 4. Timer effect z minimalnymi dependencies
  useEffect(() => {
    if (!isActive || intervalSeconds <= 0) {
      return undefined;
    }

    console.log(`[Timer] Starting with ${intervalSeconds}s interval`);

    // Pierwsze wykonanie natychmiast
    executeTask();

    // Następne co interval
    const interval = setInterval(() => {
      console.log('[Timer] Tick');
      executeTask();
    }, intervalSeconds * 1000);

    return () => {
      console.log('[Timer] Cleaning up');
      clearInterval(interval);
    };
  }, [isActive, intervalSeconds, executeTask]);
};

// Komponent główny
const MyComponent = () => {
  const [formData, setFormData] = useState({ name: 'test', value: 123 });
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [isActive, setIsActive] = useState(false);

  // 5. Stabilne callbacki dla handlerow
  const handleTick = useCallback(async () => {
    console.log('Tick executed successfully');
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('Error:', error);
  }, []);

  // 6. Używamy timera
  useTimer({
    intervalSeconds,
    isActive,
    apiUrl: 'https://api.example.com/upload',
    data: formData,
    onTick: handleTick,
    onError: handleError,
  });

  return (
    <div>
      <button onClick={() => setIsActive(!isActive)}>
        {isActive ? 'Stop' : 'Start'}
      </button>
    </div>
  );
};
```

---

## 🔍 Jak Debugować

### 1. Dodaj Logi do useEffect

```typescript
useEffect(() => {
  console.log('[Timer] Effect running', {
    isActive,
    intervalSeconds,
    timestamp: new Date().toISOString(),
  });

  // ... reszta kodu

  return () => {
    console.log('[Timer] Cleanup', {
      timestamp: new Date().toISOString(),
    });
  };
}, [isActive, intervalSeconds]);
```

**Oczekiwany output:**
```
[Timer] Effect running { isActive: true, intervalSeconds: 60, ... }
// ... cisza przez 60 sekund ...
[Timer] Cleanup
[Timer] Effect running { isActive: false, ... }
```

**Problem output:**
```
[Timer] Effect running
[Timer] Cleanup
[Timer] Effect running  // 50ms później
[Timer] Cleanup
[Timer] Effect running  // i znowu!
```

### 2. Użyj why-did-you-render

```bash
npm install @welldone-software/why-did-you-render
```

```typescript
import whyDidYouRender from '@welldone-software/why-did-you-render';

if (process.env.NODE_ENV === 'development') {
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    logOnDifferentValues: true,
  });
}

// Oznacz komponent do śledzenia
MyComponent.whyDidYouRender = true;
```

### 3. React DevTools Profiler

1. Otwórz React DevTools
2. Zakładka "Profiler"
3. Kliknij "Record"
4. Uruchom timer
5. Stop po kilku sekundach
6. Zobacz które komponenty renderują się w kółko

---

## 📋 Checklist: Czy Mój Timer Jest Bezpieczny?

- [ ] **Obiekty w deps:** Wszystkie obiekty w dependency array są opakowane w `useMemo`
- [ ] **Funkcje w deps:** Wszystkie funkcje są opakowane w `useCallback`
- [ ] **Dynamiczne wartości:** Używam `useRef` dla wartości które muszą być aktualne ale nie powinny restartować timera
- [ ] **Logi:** Dodałem logi do useEffect żeby widzieć kiedy się uruchamia
- [ ] **Cleanup:** Mam `return () => clearInterval(...)` w useEffect
- [ ] **Tylko potrzebne deps:** W dependency array są TYLKO wartości które naprawdę powinny restartować timer
- [ ] **Test:** Timer uruchamia się TYLKO gdy zmieniam `isActive` lub `intervalSeconds`

---

## 🚨 Częste Błędy

### Błąd 1: Inline Objects

```typescript
// ❌ ZŁE
useEffect(() => {
  doSomething({ foo: 'bar' });  // nowy obiekt!
}, [{ foo: 'bar' }]);  // to NIGDY nie będzie to samo!
```

### Błąd 2: Inline Functions

```typescript
// ❌ ZŁE
useEffect(() => {
  const interval = setInterval(() => {
    handleData();
  }, 1000);
  return () => clearInterval(interval);
}, [() => handleData()]);  // nowa funkcja przy każdym renderze!
```

### Błąd 3: Zapomnienie o Cleanup

```typescript
// ❌ ZŁE - memory leak!
useEffect(() => {
  setInterval(() => {
    doSomething();
  }, 1000);
  // brak return!
}, []);
```

### Błąd 4: Za Dużo Dependencies

```typescript
// ❌ ZŁE - za dużo deps
const [count, setCount] = useState(0);
const [name, setName] = useState('');
const [color, setColor] = useState('blue');

useEffect(() => {
  const interval = setInterval(() => {
    console.log('Tick');
  }, 1000);
  return () => clearInterval(interval);
}, [count, name, color]);  // restart przy każdej zmianie!

// ✅ LEPIEJ - tylko to co faktycznie jest potrzebne
useEffect(() => {
  const interval = setInterval(() => {
    console.log('Tick');
  }, 1000);
  return () => clearInterval(interval);
}, []);  // nic nie zmusza do restartu
```

---

## 🎓 Best Practices

1. **Minimum Dependencies:** Tylko to co NAPRAWDĘ musi restartować timer
2. **useMemo dla obiektów:** Zawsze jeśli obiekt idzie do deps
3. **useCallback dla funkcji:** Zawsze jeśli funkcja idzie do deps
4. **useRef dla wartości:** Gdy potrzebujesz aktualnej wartości bez restartu
5. **Logi w Development:** Zawsze loguj start/stop timera w dev mode
6. **Cleanup:** Zawsze `return () => clearInterval()`
7. **Testuj:** Sprawdź w logach czy timer startuje tylko raz

---

## 🐞 Android setInterval Bug

Na Androidzie `setInterval(fn, 1000)` może odpałać co 1ms zamiast 1000ms!

**Problem:** React Native bug #34995

**Rozwiązanie:** Date-based validation

```typescript
useEffect(() => {
  if (!isActive) return undefined;

  const intervalMs = intervalSeconds * 1000;
  let lastExecutionTime = Date.now();

  // Check every 500ms, but validate actual time
  const interval = setInterval(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTime;

    // Only execute if enough time has ACTUALLY passed
    if (timeSinceLastExecution >= intervalMs - 100) {
      console.log('[Timer] Executing (real time check passed)');
      lastExecutionTime = now;
      executeTask();
    }
  }, 500);

  // First execution immediately
  executeTask();

  return () => clearInterval(interval);
}, [isActive, intervalSeconds, executeTask]);
```

---

## 📚 Dodatkowe Zasoby

- [React useEffect docs](https://react.dev/reference/react/useEffect)
- [React useMemo docs](https://react.dev/reference/react/useMemo)
- [React useCallback docs](https://react.dev/reference/react/useCallback)
- [React Native setInterval Issue #34995](https://github.com/facebook/react-native/issues/34995)

---

## 💡 Podsumowanie

**Problem:** Niestabilne referencje (obiekty, funkcje) w dependency arrays powodują nieskończone restarty timerów.

**Rozwiązanie:**
1. ✅ `useMemo` dla obiektów
2. ✅ `useCallback` dla funkcji
3. ✅ `useRef` dla wartości które nie powinny restartować
4. ✅ Minimalne dependency arrays
5. ✅ Zawsze cleanup (`clearInterval`)

**Rezultat:** Timer uruchamia się RAZ i działa stabilnie według ustawionego interwału.
