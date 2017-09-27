Rendering 204 views/components & 2007 DOM nodes, as tested on a Win10x64 (i5-7500T), nodejs v8.6.0:

```
inferno v^3.9.0            0.444ms   2254 /s
vidom v^0.9.21             0.508ms   1968 /s
domvm v^3.2.0              0.815ms   1227 /s
preact v^8.2.5             1.345ms    743 /s
react v^16.0.0             1.451ms    689 /s
vue v^2.3.4                7.952ms    126 /s
```

Credit: https://github.com/dfilatov/vidom/tree/master/benchmarks