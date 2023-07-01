import { HTMLElement, parse } from "npm:node-html-parser@6.1.5";
import svgpath from "npm:svgpath@2.6.0";
import xmlFormat from "npm:xml-formatter@3.4.1";

function getTranslateXY(node) {
  const transform = node.getAttribute("transform");
  const numbers = transform.match(/[-+]?\d*\.?\d+/g).map(Number);
  return numbers.slice(0, 2);
}

function calcTopLeft(polygons) {
  let top = Infinity;
  let left = Infinity;
  polygons.forEach((polygon) => {
    polygon.getAttribute("points")
      .split(" ").map((x) => parseInt(x))
      .forEach((x, i) => {
        if (i % 2 == 0) {
          if (x < top) top = x;
        } else {
          if (x < left) left = x;
        }
      });
  });
  return [top, left];
}

function rewriteTopLeft(kagoshima, areas) {
  const translateX = 96;
  const translateY = 17;
  const [top, left] = calcTopLeft(areas);
  const g = new HTMLElement("g", {});
  kagoshima.appendChild(g);
  g.setAttribute(
    "transform",
    `translate(${translateX + top}, ${translateY + left})`,
  );
  areas.forEach((area) => {
    const points = area.getAttribute("points")
      .split(" ").map((x) => parseInt(x))
      .map((x, i) => (i % 2 == 0) ? x - top : x - left)
      .join(" ");
    area.setAttribute("points", points);
    g.appendChild(area);
  });
}

function splitIslands(prefectures) {
  for (const prefecture of prefectures) {
    if (prefecture.classList.contains("shiga")) continue;
    prefecture.querySelectorAll("path").forEach((path) => {
      const ds = path.getAttribute("d").split(" Z").slice(0, -1);
      if (ds.length > 1) {
        ds.forEach((d) => {
          const newPath = new HTMLElement("path", {});
          newPath.setAttribute("d", d.trimStart() + " Z");
          prefecture.appendChild(newPath);
        });
        path.remove();
      }
    });
  }
}

function splitKagoshima(doc) {
  const kagoshima = doc.querySelector(".kagoshima");
  const areas = kagoshima.querySelectorAll("polygon");
  const areas1 = areas.slice(0, 8);
  const areas2 = areas.slice(8);
  rewriteTopLeft(kagoshima, areas1);
  rewriteTopLeft(kagoshima, areas2);
  kagoshima.removeAttribute("transform");
}

function setMainIsland() {
  prefectures.forEach((prefecture) => {
    const islands = prefecture.querySelectorAll("polygon, path");
    let max = -Infinity;
    let pos;
    islands.forEach((island, i) => {
      let length;
      if (island.tagName == "PATH") {
        length = island.getAttribute("d").length;
      } else {
        length = island.getAttribute("points").length;
      }
      if (max < length) {
        max = length;
        pos = i;
      }
    });
    islands[pos].classList.add("main");
  });
}

function removeUnusedTransform(doc, prefectures) {
  doc.querySelector(".svg-map").removeAttribute("transform");
  doc.querySelector(".prefectures").removeAttribute("transform");
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  prefectures.forEach((prefecture) => {
    const [translateX, translateY] = getTranslateXY(prefecture);
    prefecture.querySelectorAll("path").forEach((path) => {
      const data = svgpath(path.getAttribute("d"));
      data.segments = data.segments.map((datum) => {
        const [type, x, y] = datum;
        return [type, x + translateX, y + translateY];
      });
      data.segments.forEach((datum) => {
        const [_type, x, y] = datum;
        if (x < left) left = x;
        if (y < top) top = y;
        if (right < x) right = x;
        if (bottom < y) bottom = y;
      });
    });
    prefecture.querySelectorAll("polygon").forEach((polygon) => {
      const data = polygon.getAttribute("points").split(" ").map(Number)
        .map((x, i) => (i % 2 == 0) ? x + translateX : x + translateY);
      data.forEach((x, i) => {
        if (i % 2 == 0) {
          if (x < left) left = x;
          if (right < x) right = x;
        } else {
          if (x < top) top = x;
          if (bottom < x) bottom = x;
        }
      });
    });
  });
  doc.querySelector("svg").setAttribute("viewBox", `0 0 ${right} ${bottom}`);
}

const text = Deno.readTextFileSync("map-full.svg");
const doc = parse(text);
const prefectures = doc.querySelectorAll(".prefecture");

removeUnusedTransform(doc, prefectures);
splitIslands(prefectures);
splitKagoshima(doc);
setMainIsland(prefectures);

doc.querySelector("svg").removeAttribute("class");
doc.querySelector("desc").textContent =
  "Created by marmooo (https://github.com/marmooo/prefectures-map-ja)";

const result = xmlFormat(doc.toString(), {
  indentation: "  ",
  lineSeparator: "\n",
  collapseContent: true,
});
console.log(result);
