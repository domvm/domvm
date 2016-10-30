| build   | size (min) | contents                              |
| ------- | ---------- | ------------------------------------- |
| pico    | ????k      |  reserved for < nano (if ever)        |
| nano    | 11.0k      |  view core                            |
| micro   | 11.7k      |  nano  + `patch` + `emit`             |
| mini    | 12.2k      |  micro + `streamCfg` + `streamFlyd`   |
| small   | 14.7k      |  mini  + `router`                     |
| full    | 16.8k      |  small + `html` + `attach` + `jsonml` |