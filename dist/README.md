| build   | size (min) | contents                                       |
| ------- | ---------- | ---------------------------------------------- |
| pico    | 10.4k      |  view core (changes if/when nano can be split) |
| nano    | 10.9k      |  pico  + `autoPx`                              |
| micro   | 11.5k      |  nano  + `patch` + `emit`                      |
| mini    | 12.1k      |  micro + `streamCfg` + `streamFlyd` + `prop`   |
| small   | 14.5k      |  mini  + `router`                              |
| full    | 16.7k      |  small + `html` + `attach` + `jsonml`          |