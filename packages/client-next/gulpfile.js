var gulp = require("gulp");
var ts = require("gulp-typescript");
const webpack = require("webpack-stream");
const sass = require("gulp-sass")(require("sass"));

gulp.task("css", function () {
  return gulp
    .src("src/style.scss")
    .pipe(sass().on("error", sass.logError))
    .pipe(gulp.dest("./public/css"));
});

gulp.task("js", function () {
  return gulp
    .src("src/**/*.tsx?")
    .pipe(webpack(require("./webpack.config.js")))
    .pipe(gulp.dest("public"));
});

gulp.task(
  "watch",
  gulp.series("js", "css", function () {
    gulp.watch(
      [
        "src/**/*.ts",
        "src/**/*.tsx",
        "../lib/src/**/*.ts",
        "../lib/src/**/*.tsx",
      ],
      gulp.series("js")
    );
    gulp.watch("src/**/*.scss", gulp.series("css"));
  })
);
