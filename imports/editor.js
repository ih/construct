var Programs;

export default class Editor {

  constructor(editorSelector, ProgramsCollection) {
    Programs = ProgramsCollection;
    var self = this;

    self.editorSelector = editorSelector;

    // move these constants to a Program module or use a schema
    self.INITIALIZE = 'initialize';
    self.UPDATE = 'update';
    self.MODULE_CODE = 'code';
    self.CODE_ATTRIBUTES = [self.INITIALIZE, self.UPDATE, self.MODULE_CODE];
    self.ATTRIBUTES = 'attributes';
    // used to determine what can be thrown away
    self.REQUIRED_PROPERTIES = _.union(
      self.CODE_ATTRIBUTES, [
        'position', 'contributors', 'man', 'name', 'ancestry']);

    self.isActive = new ReactiveVar(false);
    self.isLoaded = false;
    self.program = new ReactiveVar(undefined);
    self.activeSection = new ReactiveVar(self.INITIALIZE);

    AceEditor.instance('ace-editor', {
      theme: 'dawn',
      mode: 'javascript'
    }, (editor) => {
      self.editor = editor;
      self.isLoaded = true;
      self.editor.session.setOptions({
        tabSize: 2
      });

      self.editor.getSession().on('change', _.debounce(() => {
        var program = self.program.get();
        var activeSection = self.activeSection.get();
        var newProgramValue = self.editor.getSession().getValue();
        if (program) {
          var updateFields = {};
          // dictionary passed to Programs.update
          // defined here so that we can conditionally set $unset field
          var updateObject = {};
          if (activeSection === self.ATTRIBUTES) {
            var removeFields = {};
            updateFields = _.omit(JSON.parse(newProgramValue), '_id');
            var fieldNamesToRemove = _.difference(
              _.keys(_.omit(program, '_id')), _.keys(updateFields));
            fieldNamesToRemove = _.difference(
              fieldNamesToRemove, self.REQUIRED_PROPERTIES);
            if (!_.isEmpty(fieldNamesToRemove)) {
              _.each(fieldNamesToRemove, (fieldName) => {
                removeFields[fieldName] = "";
              });
              updateObject['$unset'] = removeFields;
            }
          } else {
            updateFields[activeSection] = newProgramValue;
          }

          updateObject['$set'] = updateFields;

          Programs.update({
            _id: program._id
          }, updateObject);
        }
      }, 300));

      self.updateDisplay();
    });
    $(this.editorSelector).hide();

    console.log('hey editor');
  }

  setActiveSection(sectionName) {
    this.activeSection.set(sectionName);
  }

  // reactively reset the text displayed in the editor any time the program or
  // active section changes
  updateDisplay() {
    var self = this;
    Tracker.autorun(() => {
      var program = self.program.get();
      var activeSection = self.activeSection.get();
      if (program === undefined) {
        self.setValue(self.defaultText());
      } else if (activeSection === self.ATTRIBUTES) {
        var attributes = _.omit(program, self.CODE_ATTRIBUTES);
        self.setValue(JSON.stringify(attributes, null, 2));
      } else {
        self.setValue(program[activeSection]);
      }
    });

  }

  activate() {
    $(this.editorSelector).show();
    this.isActive.set(true);
  }

  deactivate() {
    $(this.editorSelector).hide();
    this.isActive.set(false);
  }

  setProgram(program) {
    this.program.set(program);
  }

  deleteProgram() {
    Programs.remove(this.program.get()._id, (error) => {
      console.log(JSON.stringify(error));
    });
    this.clear();
  }

  copyProgram(newPosition) {
    var program = this.program.get();
    var programCopy = $.extend(true, {}, program);
    delete programCopy._id;
    programCopy.position = newPosition;
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
    programCopy.name = `Copy of ${program.name || program._id} at ${new Date()}`;
    programCopy._id = Programs.insert(programCopy);
    this.setProgram(programCopy);
  }

  clear() {
    // change visible parts of the editor
    this.setValue(this.defaultText());
    this.program.set(undefined);
  }


  setValue(text) {
    var cursorPosition = this.editor.getCursorPosition();
    this.editor.setValue(text);
    this.editor.moveCursorToPosition(cursorPosition);
    this.editor.clearSelection();
  }

  toggle() {
    if (this.isActive.get()) {
      this.deactivate();
    } else {
      this.activate();
    }
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
