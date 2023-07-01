# japanese-prefectures

SVG フォーマットで作られた日本の都道府県の地図です。

## Features

- 不要な transform の除去
- 県内の本島と離島を分離
- 鹿児島県を屋久島で分離
- 本島をクラス化

## Build

```
deno run --allow-read build.js > map.svg
```

## License

GFDL

## Attribution

- `map-full.svg` is cloned from
  [geolonia/japanese-prefectures](https://github.com/geolonia/japanese-prefectures)
  licensed under the GFDL
