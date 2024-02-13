This is a merge of two projects

- https://github.com/BetterTyped/react-zoom-pan-pinch
- https://github.com/pxlsspace/Pxls

react-zoom-pan-pinch handles most cases, but doesn't support css `zoom` property, which Pxls found out(?) that on some browsers, css `zoom` can be used to make canvas elements not blurry on some browsers

react-zoom-pan-pinch would've required a lot of modifications to how it calculates touch points as css `zoom` changes coordinates returned by events

Both projects are MIT licensed
