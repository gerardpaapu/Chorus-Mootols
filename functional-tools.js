var op = {
    "-": function(a, b) {
        return (arguments.length < 2) ? -a : a - b;
    },
    "!": function(a) {return !a;},
    "typeof": function(a) {return typeof a;},
    "?": function(a, b, c) {return a ? b : c;},
    "+": function(a, b) { return a + b; },
    "*": function(a, b) { return a * b; },
    "/": function(a, b) { return a / b; },
    "%": function(a, b) { return a % b; },
    "&&": function(a, b) { return a && b; },
    "||": function(a, b) { return a || b; },
    "==": function(a, b) { return a == b; },
    "!=": function(a, b) { return a != b; },
    "===": function(a, b) { return a === b; },
    "!==": function(a, b) { return a !== b; },
    "<": function(a, b) { return a < b; },
    ">": function(a, b) { return a > b; },
    ">=": function(a, b) { return a >= b; },
    "<=": function(a, b) { return a <= b; },
    "in": function(a, b) { return a in b; },
    "instanceof": function(a, b) { return a instanceof b; }
};

function compose (fn1, fn2) {
    function compose2 (fn1, fn2) {
        return function () {
            return fn1(fn2.apply(null, arguments));
        };
    }

    var n = arguments.length,
        rest = $A(arguments).slice(1);

    return n === 0 ? $arguments(0)
        :  n === 1 ? fn1
        :  n === 2 ? compose2(fn1, fn2)
        :  compose2(fn1, compose.apply(null, rest));
}

function method(object, name) {
    return function() {
        object[name].apply(object, arguments);
    };
}

Function.implement({
    'curry': function () {
        var fn = this, args = $A(arguments);
        return function () {
            return fn.run(args.concat($A(arguments)));
        };
    },

    'curryR': function () {
        var fn = this, args = $A(arguments);
        return function () {
            return fn.run($A(arguments).concat(args));
        };
    }
});

Array.implement({
    'reduce': function (fn, init) {
        if (! $defined(init)) return this.slice(1).reduce(fn, this[0]);

        for (var i = 0, l = this.length, value = init; i < l; i++)
            value = fn.call(null, value, this[i], i, this);

        return value;
    }
});
