module.exports = function (grunt) {
    'use strict';
    
    var pwd = grunt.file.read(".pwd");
    
    grunt.initConfig({
        jshint: {
            options: {
                reporter: require("jshint-stylish"),
                loopfunc: true
            },
            build: ["Gruntfile.js", "src/js/nav.js", "src/js/resultCharts.js"]
        },
        uglify: {
            pre: {
                options: {
                    compress: true
                },
                files: {
                    "src/js/build/main1.js": [
                        "src/js/vendor/jquery/jquery.js",
                        "src/js/vendor/jquery/jquery-ui.js",
                        "src/js/vendor/select2/select2.js",
                        "src/js/vendor/jquery.dataTables.min.js",
                        "src/js/vendor/dataTables.colReorder.min.js",
                        "src/js/vendor/dataTables.fixedColumns.min.js",
                        "src/js/vendor/dataTables.fixedHeader.min.js",
                        "src/js/vendor/bootstrap.js",
                        "src/js/vendor/mustache.min.js"
                    ], "src/js/build/main2.js": [
                        "src/js/vendor/ol3/ol3-loadingpanel.js",
                        "src/js/vendor/ol3/ol3-zoomtomaxextent.js",
                        "src/js/vendor/ol3/ol3-layerswitcher.js",
                        "src/js/vendor/ol3/ol3-popup.js",
                        "src/js/vendor/highcharts.js",
                        "arc/js/vendor/exporting.js",
                        "src/js/main.js",
                        "src/js/nav.js",
                        "src/js/resultCharts.js",
                        "src/js/liveDev.js"
                    ]
                }
            },
            post: {
                options: {
                    compress: false
                },
                files: {
                    "dist/js/main.js": [
                        "src/js/build/main1.js",
                        "src/js/vendor/ol3/ol3-debug.js",
                        "src/js/build/main2.js"
                    ]
                }
            }
        },
        'optimize-js': {
            options: {
                sourceMap: false,
                silent: false
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: 'dist/',
                    src: ['js/main.js'],
                    dest: 'dist/'
                }]
            }
        },
        less: {
            dist: {
                files: {
                    "dist/css/main.css": ["src/less/main.less"]
                }
            }
        },
        cssmin: {
            dist: {
                files: {
                    "dist/css/main.css": ["dist/css/main.css"]
                }
            }
        },
        imagemin: {
            png: {
                options: {
                    optimizationLevel: 7
                },
                files: [
                    {
                        expand: true,
                        cwd: "src/",
                        src: ["**/*.png"],
                        dest: "dist/",
                        ext: ".png"
					}
				]
            },
            jpg: {
                options: {
                    progressive: true
                },
                files: [
                    {
                        expand: true,
                        cwd: "src/",
                        src: ["**/*.jpg"],
                        dest: "dist/",
                        ext: ".jpg"
					}
				]
            },
            gif: {
                options: {
                    interlaced: true
                },
                files: [
                    {
                        expand: true,
                        cwd: "src/",
                        src: ["**/*.gif"],
                        dest: "dist/",
                        ext: ".gif"
					}
				]
            }
        },
        xmlmin: {
            dist: {
                options: {
                    preserveComments: false
                },
                files: {
                    'dist/crossdomain.xml': 'src/crossdomain.xml'
                }
            }
        },
        'json-minify': {
            build: {
                files: 'dist/data/geodata.json'
            }
        },
        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    minifyCSS: true,
                    minifyJS: true
                },
                files: grunt.file.expandMapping('**/*.html', 'dist/', {
                    cwd: 'src/'
                })
            }
        },
        copy: {
            fonts: {
                files: [{
                    expand: true,
                    cwd: "src/fonts/",
                    src: ["**/*.*"],
                    dest: "dist/fonts/"
                }]
            },
            json: {
                files: [{
                    expand: true,
                    cwd: "src/",
                    src: ["**/*.json"],
                    dest: "dist/"
                }]
            },
            misc: {
                files: [{
                    expand: true,
                    cwd: "src/",
                    src: ["**/*.ico", "**/*.php", "robots.txt", ".htaccess", "**/*.md", "**/*.txt"],
                    dest: "dist/"
                }]
            },
            /*brokenJS: {
                files: [{
                    expand: true,
                    cwd: "src/",
                    src: "js/vendor/ol3/ol3-debug.js",
                    dest: "dist/"
                }]
            }*/
        },
        markdown: {
            all: {
                files: grunt.file.expandMapping('**/*.md', 'src/', {
                    cwd: 'src/',
                    ext: ".html"
                })
            }
        },
        watch: {
            html: {
                files: ["src/**/*.html", "src/**/*.php"],
                tasks: ["htmlmin", "githubChanges", "shell"]
            },
            styles: {
                files: ["src/**/*.css", "src/**/*.less"],
                tasks: ["less", "cssmin", "githubChanges", "shell"]
            },
            scripts: {
                files: ["src/js/**/*.js", "src/templates/*.hbs"],
                tasks: ["jshint", "uglify", "optimize-js", "githubChanges", "shell"]
            },
            json: {
                files: ["src/**/*.json"],
                tasks: ["copy:json", "json-minify", "githubChanges", "shell"]
            },
            xml: {
                files: ["src/**/*.xml"],
                tasks: ["xmlmin", "githubChanges", "shell"]
            }
        },
        githubChanges: {
            dist : {
                options: {
                    owner : 'tomskarning',
                    repository : 'mpa-web'
                }
            }
        },
        shell: {
            liveDev: {
                command: 'epoch="$(date +%s)" && cd dist/json/ && echo "jsonCallback({ \"lastModified\": ${epoch} })" > liveDev.json'
            },
            upload: {
                command: 'cd dist && lftp -e "mirror -R; exit" sftp://mpaweb:'+pwd+'@catalina.grida.no/home/mpaweb/public_html'
            },
            /*github: {
                command: 'git add *; git commit -m "-"; git push'
            }*/
        }
    });

    require("load-grunt-tasks")(grunt);

    grunt.registerTask("default", ["jshint", "uglify", "optimize-js", "markdown", "htmlmin", "less", "cssmin", "json-minify", "imagemin", "copy", "githubChanges", "shell"]);
};