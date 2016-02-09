// based on http://adndevblog.typepad.com/cloud_and_mobile/2015/07/embedding-webpages-in-a-3d-threejs-scene.html
// the editor doesn't actually change programs, but has reactive variables that
// correspond to editable parts of a program then whatever is using the editor
// (e.g. the main construct file) responds to changes and does the actual update
// of the program

var Programs;

Editor = class Editor {
  constructor(editorSelector, ProgramsCollection) {
    Programs = ProgramsCollection;

    var self = this;
    self.INITIALIZE = 0;
    self.UPDATE = 1;
    self.ATTRIBUTES = 2;
    self.isActive = false;
    self.editorSelector = editorSelector;
    self.isLoaded = false;
    self.programId = null;
    self.initializeFunction = new ReactiveVar(null);
    self.updateFunction = new ReactiveVar(null);
    self.programName = new ReactiveVar(null);
    self.currentFunction = self.INITIALIZE;
    self.programSelectorSelector = '.program-selector';
    self.programNameSelector = '.program-name-field';

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
    $('.show-attributes')[0].addEventListener('click', () => {
      self.showAttributes();
    });
    $('.delete-program')[0].addEventListener('click', () => {
      self.deleteProgram();
    });
    $(self.programNameSelector)[0].addEventListener('change', (event) => {
      var newName = $(event.currentTarget).val();
      self.programName.set(newName);
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
    //console.log('loading program into editor:' + JSON.stringify(program));
    this.programId = program._id;
    this.initializeFunction.set(program.initialize);
    this.updateFunction.set(program.update);
    this.showInitializationCode();
    $(this.programSelectorSelector).val(program._id);
    $(this.programNameSelector).val(program.name || program._id);
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

  showAttributes() {
    this.currentFunction = this.ATTRIBUTES;
    Tracker.autorun((computation) => {
      if (this.currentFunction === this.ATTRIBUTES) {
        var program = Programs.findOne(this.programId);
        var attributes = _.omit(program, ['initialize', 'update']);
        this.setValue(JSON.stringify(attributes));
      } else {
        computation.stop();
      }
    });
  }

  deleteProgram() {
    Programs.remove(this.programId, (error) => {
      console.log(JSON.stringify(error));
    });
    this.clear();
  }

  clear() {
    // change visible parts of the editor
    this.setValue('');
    $(this.programNameSelector).val(null);
    $(this.programSelectorSelector).val(null);

    this.programId = null;
    this.programName.set(null);
    this.initializeFunction.set(null);
    this.updateFunction.set(null);
    this.currentFunction = self.INITIALIZE;
  }

  updateProgramSelector(programsCursor) {
    var self = this;
    $(this.programSelectorSelector).find('option').remove();
    // add a none option
    $(this.programSelectorSelector).append($('<option>', {
      value: null,
      text: 'None',
      selected: !self.programId
    }));
    programsCursor.forEach((program) => {
      console.log('program name ' + program.name);
      $(this.programSelectorSelector)
        .append($('<option>', {
          value: program._id,
          text: program.name || program._id,
          selected: program._id === self.programId
        }));
    });
  }

};
