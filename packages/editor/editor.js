// based on http://adndevblog.typepad.com/cloud_and_mobile/2015/07/embedding-webpages-in-a-3d-threejs-scene.html
// the editor doesn't actually change programs, but has reactive variables that
// correspond to editable parts of a program then whatever is using the editor
// (e.g. the main construct file) responds to changes and does the actual update
// of the program

var Programs;

Editor = class Editor {
  // userProgramId is only used for copyProgram to get the user position
  // can we get rid of it? or maybe user program should be more universally
  // accessible?
  constructor(editorSelector, ProgramsCollection, userProgramId) {
    Programs = ProgramsCollection;

    var self = this;
    self.INITIALIZE = 0;
    self.UPDATE = 1;
    self.ATTRIBUTES = 2;
    self.isActive = new ReactiveVar(false);
    self.editorSelector = editorSelector;
    self.isLoaded = false;
    self.programId = null;
    self.userProgramId = userProgramId;
    self.initializeFunction = new ReactiveVar(null);
    self.updateFunction = new ReactiveVar(null);
    self.programName = new ReactiveVar(null);
    self.programAttributes = new ReactiveVar(null);
    self.currentSection = self.INITIALIZE;
    self.programSelectorSelector = '.program-selector';
    self.programNameSelector = '.program-name-field';

    AceEditor.instance('ace-editor', {
      theme: 'dawn',
      mode: 'javascript'
    }, (editor) => {
      self.editor = editor;
      self.isLoaded = true;
      self.editor.session.setOptions({
        tabSize: 2
      });
      self.initializeEvents();
      self.setValue(self.defaultText());
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
    $('.copy-program')[0].addEventListener('click', () => {
      self.copyProgram();
    });
    $(self.programNameSelector)[0].addEventListener('change', (event) => {
      var newName = $(event.currentTarget).val();
      self.programName.set(newName);
    });
    this.editor.getSession().on('change', () => {
      if (!self.programId) {
        return;
      }
      if (self.currentSection === self.INITIALIZE) {
        // console.log('inside the change handler ' + self.programId);
        self.initializeFunction.set(self.editor.getSession().getValue());
      } else if (self.currentSection === self.UPDATE) {
        self.updateFunction.set(self.editor.getSession().getValue());
      } else if (self.currentSection === self.ATTRIBUTES) {
        self.programAttributes.set(self.editor.getSession().getValue());
      }
    });
  }

  toggle() {
    if (this.isActive.get()) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  activate() {
    $(this.editorSelector).show();
    this.isActive.set(true);
  }

  deactivate() {
    $(this.editorSelector).hide();
    this.isActive.set(false);
  }

  insert(text) {
    this.editor.insert(text);
  }

  setValue(text) {
    var cursorPosition = this.editor.getCursorPosition();
    this.editor.setValue(text);
    this.editor.moveCursorToPosition(cursorPosition);
    this.editor.clearSelection();
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
    this.currentSection = this.INITIALIZE;
    var code = this.initializeFunction.get();
    Tracker.nonreactive(() => {this.setValue(code, -1);});
  }

  updateInitializationCode(newCode) {
    this.initializeFunction.set(newCode);
    if (this.currentSection === this.INITIALIZE) {
      this.setValue(newCode);
    }
  }

  updateUpdateCode(newCode) {
    this.updateFunction.set(newCode);
    if (this.currentSection === this.UPDATE) {
      this.setValue(newCode);
    }
  }

  showUpdateCode() {
    this.currentSection = this.UPDATE;
    Tracker.nonreactive(() => {this.setValue(this.updateFunction.get(), -1);});
  }

  showAttributes() {
    this.currentSection = this.ATTRIBUTES;
    Tracker.autorun((computation) => {
      if (this.currentSection === this.ATTRIBUTES) {
        var program = Programs.findOne(this.programId);
        var attributes = _.omit(program, ['initialize', 'update']);
        this.setValue(JSON.stringify(attributes, null, 2));
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

  copyProgram() {
    var program = Programs.findOne(this.programId);
    var programCopy = $.extend(true, {}, program);
    delete programCopy._id;
    programCopy.position = Programs.findOne(this.userProgramId).position;
    programCopy.contributors = [Meteor.user().username];
    var ancestryData = {
      id: program._id,
      name: program.name,
      contributors: program.contributors
    };
    if (programCopy.ancestry) {
      programCopy.ancestry.push(ancestryData);
    } else {
      programCopy.ancestry = [ancestryData];
    }
    programCopy.name = `Copy of ${program.name || program._id}`;
    programCopy._id = Programs.insert(programCopy);
    this.loadProgram(programCopy);
  }

  clear() {
    // change visible parts of the editor
    this.setValue(this.defaultText());
    $(this.programNameSelector).val(null);
    $(this.programSelectorSelector).val(null);

    this.programId = null;
    this.programName.set(null);
    this.initializeFunction.set(null);
    this.updateFunction.set(null);
    this.currentSection = self.INITIALIZE;
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

  defaultText() {
    return `
Click on an object or select one from the drop down menu to see it's source code.

You can only edit programs where you are listed as a contributor (click the
'Attributes' button to see the list of contributors as well as other properties
of the program.

Each program has two main functions.  The 'Initialize' function runs when
the world is loaded and the 'update' function that runs with the rendering
loop (many times per second).  You can view each of these functions by
pressing the buttons above.

Check out the 'example program' in the drop down menu to see how to write
initialize and update functions for your program.

      `;
  }

};
