// based on http://adndevblog.typepad.com/cloud_and_mobile/2015/07/embedding-webpages-in-a-3d-threejs-scene.html

var INITIALIZE = 0;
var UPDATE = 1;

Editor = class Editor {
  constructor(editorSelector) {

    var self = this;
    self.isActive = false;
    self.editorSelector = editorSelector;
    self.isLoaded = false;
    self.programId = null;
    self.initializeFunction = new ReactiveVar(null);
    self.updateFunction = new ReactiveVar(null);
    self.currentFunction = INITIALIZE;

    AceEditor.instance('ace-editor', {
      theme: 'dawn',
      mode: 'javascript'
    }, (editor) => {
      self.editor = editor;
      self.isLoaded = true;
      self.initializeEvents();
    });
    $(this.editorSelector).hide();
  }

  initializeEvents() {
    var self = this;
    $('.initialization-code')[0].addEventListener('click', () => {
      self.showInitializationCode();
    });
    $('.update-code')[0].addEventListener('click', () => {
      self.showUpdateCode();
    });
    this.editor.getSession().on('change', () => {
      if (!self.programId) {
        return;
      }
      if (self.currentFunction === INITIALIZE) {
        console.log('inside the change handler ' + self.programId);
        self.initializeFunction.set(self.editor.getSession().getValue());
      } else if (self.currentFunction === UPDATE) {
        self.updateFunction.set(self.editor.getSession().getValue());
      }
    });
  }

  toggle() {
    if (this.isActive) {
      $(this.editorSelector).hide();
      this.isActive = false;
    } else {
      $(this.editorSelector).show();
      this.isActive = true;
    }
  }

  insert(text) {
    this.editor.insert(text);
  }

  setValue(text) {
    this.editor.setValue(text);
  }

  loadProgram(program) {
    console.log('loading program into editor:' + JSON.stringify(program));
    this.programId = program._id;
    this.initializeFunction.set(program.initialize);
    this.updateFunction.set(program.update);
    this.showInitializationCode();
  }

  showInitializationCode() {
    console.log('showing init code ' + this);
    var code = this.initializeFunction.get();
    this.setValue(code, -1);
    this.currentFunction = INITIALIZE;
  }

  showUpdateCode() {
    this.setValue(this.updateFunction.get(), -1);
    this.currentFunction = UPDATE;
  }

};
