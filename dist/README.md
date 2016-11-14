| build      | size (min) | contents                                       |
| ---------- | ---------- | ---------------------------------------------- |
| [pico][1]  | 10.4k      |  view core (changes if/when nano can be split) |
| [nano][2]  | 10.9k      |  pico  + `autoPx`                              |
| [micro][3] | 11.5k      |  nano  + `patch` + `emit`                      |
| [mini][4]  | 12.1k      |  micro + `streamCfg` + `streamFlyd` + `prop`   |
| [small][5] | 14.5k      |  mini  + `router`                              |
| [full][6]  | 16.7k      |  small + `html` + `attach` + `jsonml`          |

[1]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/pico/domvm.pico.min.js
[2]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/nano/domvm.nano.min.js
[3]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/micro/domvm.micro.min.js
[4]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/mini/domvm.mini.min.js
[5]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/small/domvm.small.min.js
[6]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/full/domvm.full.min.js