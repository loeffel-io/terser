var colors = require("colors");
var fs = require("fs");

var config = {
    limit: 5000,
    timeout: function(limit) {
        this.limit = limit;
    }
};
var tasks = [];
var titles = [];
describe = function(title, fn) {
    config = Object.create(config);
    titles.push(title);
    fn.call(config);
    titles.pop();
    config = Object.getPrototypeOf(config);
};
it = function(title, fn) {
    fn.limit = config.limit;
    fn.titles = titles.slice();
    fn.titles.push(title);
    tasks.push(fn);
};

fs.readdirSync("test/mocha").filter(function(file) {
    return /\.js$/.test(file);
}).forEach(function(file) {
    require("./mocha/" + file);
});

function log_titles(log, current, marker) {
    var indent = "";
    var writing = false;
    for (var i = 0; i < current.length; i++, indent += "  ") {
        if (titles[i] != current[i]) writing = true;
        if (writing) log(indent + (i == current.length - 1 && marker || "") + current[i]);
    }
    titles = current;
}

var errors = [];
var total = tasks.length;
titles = [];
process.nextTick(function run() {
    var task = tasks.shift();
    if (task) try {
        var elapsed = Date.now();
        var timer;
        var done = function() {
            clearTimeout(timer);
            done = function() {};
            elapsed = Date.now() - elapsed;
            if (elapsed > task.limit) {
                throw new Error("Timed out: " + elapsed + "ms > " + task.limit + "ms");
            }
            log_titles(console.log, task.titles, colors.green('\u221A '));
            process.nextTick(run);
        };
        if (task.length) {
            task.timeout = function(limit) {
                clearTimeout(timer);
                task.limit = limit;
                timer = setTimeout(function() {
                    raise(new Error("Timed out: exceeds " + limit + "ms"));
                }, limit);
            };
            task.timeout(task.limit);
            task.call(task, done);
        } else {
            task.timeout = config.timeout;
            task.call(task);
            done();
        }
    } catch (err) {
        raise(err);
    } else if (errors.length) {
        console.error();
        console.log(colors.red(errors.length + " test(s) failed!"));
        titles = [];
        errors.forEach(function(titles, index) {
            console.error();
            log_titles(console.error, titles, (index + 1) + ") ");
            var lines = titles.error.stack.split('\n');
            console.error(colors.red(lines[0]));
            console.error(lines.slice(1).join("\n"));
        });
        process.exit(1);
    } else {
        console.log();
        console.log(colors.green(total + " test(s) passed."));
    }

    function raise(err) {
        clearTimeout(timer);
        done = function() {};
        task.titles.error = err;
        errors.push(task.titles);
        log_titles(console.log, task.titles, colors.red('\u00D7 '));
        process.nextTick(run);
    }
});
