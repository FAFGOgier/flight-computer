// Entry point shared by the MSFS panel and the browser test bench.
(function (g) {
    'use strict';
    var FC = g.FC = g.FC || {};

    FC.mount = function (root) {
        var app = new FC.App(root);
        app.addFace(new FC.CalcFace());
        app.addFace(new FC.WindFace());
        app.start();
        FC.app = app;
        return app;
    };

    var auto = document.getElementById('fc-root');
    if (auto) { FC.mount(auto); }
})(typeof window !== 'undefined' ? window : this);
