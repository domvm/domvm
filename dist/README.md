| build      | min / gz     | contents                                                      | brings                                                                                                                                                                                         |
| ---------- | ------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [pico][1]  | 10.0k / 4.0k | view core (changes if/when nano can be split)                 | dom recycling, lifecycle hooks, parameterized events & delegation, sub-views, element injection, raw html, vnode refs, css objects                                                             |
| [nano][2]  | 11.6k / 4.7k | pico  + `cssTag` + `autoPx` + `spreadBody` + `diff` + `patch` | tpl conveniences: `"input[type=checkbox].some-class"`, `{style: {width: 20}}`, `el("div", el("span", "foo")...)`; optims: `vnode.patch({class: ..., style...})`, `vm.diff({vals:...then:...})` |
| [micro][3] | 12.1k / 4.9k | nano  + `emit` + `vmBody`                                     | subview-to-parent events `vm.emit('myNotif', arg1, arg2...)`, `vm.body()` can get child views                                                                                                  |
| [mini][4]  | 12.7k / 5.1k | micro + `streamCfg` + `streamFlyd` + `prop`                   | view reactivity; reduce need for explicit `redraw()` calls                                                                                                                                     |
| [small][5] | 15.1k / 6.2k | mini  + `router`                                              | client-side router                                                                                                                                                                             |
| [full][6]  | 16.8k / 6.8k | small + `html` + `attach`                                     | isomorphism/SSR                                                                                                                                                                                |

[1]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/pico/domvm.pico.min.js
[2]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/nano/domvm.nano.min.js
[3]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/micro/domvm.micro.min.js
[4]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/mini/domvm.mini.min.js
[5]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/small/domvm.small.min.js
[6]: https://github.com/leeoniya/domvm/blob/2.x-dev/dist/full/domvm.full.min.js