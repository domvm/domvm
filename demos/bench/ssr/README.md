Rendering 204 views/components & 2007 DOM nodes, as tested on a Linode 4096, Debian unstable, nodejs v8.1.3:

```
inferno v^3.6.1            0.851ms   1175 /s
vidom v^0.9.15             1.063ms    941 /s
domvm v^3.0.2              1.344ms    744 /s
preact v^8.1.0             2.694ms    371 /s
react.with-hack v^15.6.1   9.325ms    107 /s
vue v^2.3.4               20.130ms     50 /s
react v^15.6.1            27.448ms     36 /s
```

Credit: https://github.com/dfilatov/vidom/tree/master/benchmarks