# Double Range Slider Web

![double range slider screenshot](./slider.png)

A slider with two knobs for the selection of a value range, realized as a web component `<double-range-slider>`. 

## Installation

Using `npm`:

```
npm install double-range-slider-web
```

## Usage

Html:

```
<double-range-slider>
```

Typescript:

```
import {DoubleRangeSlider} from "double-range-slider-web";

DoubleRangeSlider.register();
```

## Configuration

### Attributes and properties

Supported attributes include `disabled`, `min`, `max`, `step`, with the same semantics as for single-value `<input type="range">` elements: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range.


### CSS

The component style can be adapted with CSS variables.

```
/* Thumb dimensions */
--dri-thumb-width: 24px; 
--dri-thumb-height: 24px;
--dri-thumb-border-radius: 24px;

/* Thumb color */
--dri-thumb-color: #ddd;
--dri-thumb-hover-color: #fb8cc9ff;
--dri-thumb-active-color: #fb8cc9ff;
--dri-thumb-disabled-color: #777;

/* Track */
--dri-track-height: 4px;
--dri-track-color: #ccc; 
--dri-track-filled-color: #f72d9c;
--dri-track-filled-color-disabled: #777;
```

Most variable names follow the convention of https://github.com/Stanko/dual-range-input.

## How it works

See the excellent blog post: https://muffinman.io/blog/native-dual-range-input/.

## Development

* Prerequisites: NodeJS/npm
* Install dependencies: `npm install`
* Build: `npm run build`
* Run: a sample HTML page is included in the repository, see [index.html](./index.html). Run `npm run build` first, then `npx http-server`. Then open the browser at http://localhost:8080. 
* Tests: none

## License

MIT

## Alternatives

* https://github.com/Stanko/dual-range-input
* https://www.mdui.org/en/docs/2/components/range-slider

