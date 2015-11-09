Package.describe({
  name: 'irvin:editor',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'An editor that can be used in the construct.',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: null
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.addFiles('editor.js');
  api.export('Editor');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('irvin:editor');
  api.addFiles('editor-tests.js');
});
