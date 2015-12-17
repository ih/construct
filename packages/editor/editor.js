// based on http://adndevblog.typepad.com/cloud_and_mobile/2015/07/embedding-webpages-in-a-3d-threejs-scene.html

Editor = class Editor {
  constructor(editorSelector) {

    var self = this;
    self.INITIALIZE = 0;
    self.UPDATE = 1;
    self.isActive = false;
    self.editorSelector = editorSelector;
    self.isLoaded = false;
    self.programId = null;
    self.initializeFunction = new ReactiveVar(null);
    self.updateFunction = new ReactiveVar(null);
    self.currentFunction = self.INITIALIZE;

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
      if (self.currentFunction === self.INITIALIZE) {
        console.log('inside the change handler ' + self.programId);
        self.initializeFunction.set(self.editor.getSession().getValue());
      } else if (self.currentFunction === self.UPDATE) {
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
    this.currentFunction = this.INITIALIZE;
    var code = this.initializeFunction.get();
    Tracker.nonreactive(() => {this.setValue(code, -1);});
  }

  showUpdateCode() {
    this.currentFunction = this.UPDATE;
    Tracker.nonreactive(() => {this.setValue(this.updateFunction.get(), -1);});
  }

  clear() {
    this.setValue('');
    this.programId = null;
    this.initializeFunction.set(null);
    this.updateFunction.set(null);
    this.currentFunction = self.INITIALIZE;
  }

};
