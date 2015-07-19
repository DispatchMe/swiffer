var gulp = require('gulp'),
  jasmine = require('gulp-jasmine'),
  cover = require('gulp-coverage');

gulp.task('jasmine', function () {
  return gulp.src('lib/**/*.js')
    .pipe(cover.instrument({
      pattern: ['lib/**/*.js', '!lib/**/*Spec.js'],
      debugDirectory: 'debug'
    }))
    .pipe(jasmine())
    .pipe(cover.gather())
    .pipe(cover.format())
    .pipe(gulp.dest('reports'));
});
