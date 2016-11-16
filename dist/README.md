| build      | min / gz     | contents                                       | brings                                                                                                                                                      |
| ---------- | ------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [pico][1]  | 9.9k / 4.0k  | view core (changes if/when nano can be split)  | dom recycling, lifecycle hooks, parameterized events & delegation, sub-views, element injection, raw html, vnode refs, css objects                          |
| [nano][2]  | 11.3k / 4.6k | pico  + `cssTag` + `autoPx` + `diff` + `patch` | tpl conveniences: `"input[type=checkbox].some-class"`, `{style: {width: 20}}`; optims: `vnode.patch({class: ..., style...})`, `vm.diff({vals:...then:...})` |
| [micro][3] | 11.8k / 4.7k | nano  + `emit` + `vmBody`                      | subview-to-parent events `vm.emit('myNotif', arg1, arg2...)`, `vm.body()` can get child views                                                               |
| [mini][4]  | 12.4k / 5.0k | micro + `streamCfg` + `streamFlyd` + `prop`    | view reactivity; reduce need for explicit `redraw()` calls                                                                                                  |
| [small][5] | 14.8k / 6.1k | mini  + `router`                               | client-side router                                                                                                                                          |
| [full][6]  | 16.9k / 6.9k | small + `html` + `attach` + `jsonml`           | isomorphism/SSR, jsonml template preprocessor                                                                                                               |

[1]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/pico/domvm.pico.min.js
[2]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/nano/domvm.nano.min.js
[3]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/micro/domvm.micro.min.js
[4]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/mini/domvm.mini.min.js
[5]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/small/domvm.small.min.js
[6]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/full/domvm.full.min.js