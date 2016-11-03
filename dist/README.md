| build   | size (min) | contents                                       |
| ------- | ---------- | ---------------------------------------------- |
| pico    | ????k      |  reserved for < nano (if ever)                 |
| nano    | 10.9k      |  view core                                     |
| micro   | 11.6k      |  nano  + `patch` + `emit`                      |
| mini    | 12.2k      |  micro + `streamCfg` + `streamFlyd` + `prop`   |
| small   | 14.7k      |  mini  + `router`                              |
| full    | 16.8k      |  small + `html` + `attach` + `jsonml`          |