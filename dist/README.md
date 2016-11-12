| build   | size (min) | contents                                       |
| ------- | ---------- | ---------------------------------------------- |
| pico    | ????k      |  reserved for < nano (if ever)                 |
| nano    | 10.8k      |  view core                                     |
| micro   | 11.5k      |  nano  + `patch` + `emit`                      |
| mini    | 12.1k      |  micro + `streamCfg` + `streamFlyd` + `prop`   |
| small   | 14.5k      |  mini  + `router`                              |
| full    | 16.6k      |  small + `html` + `attach` + `jsonml`          |