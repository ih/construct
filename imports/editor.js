var Programs;

export default class Editor {

  constructor(editorSelector, ProgramsCollection) {
    Programs = ProgramsCollection;
    var self = this;

    self.editorSelector = editorSelector;

    self.INITIALIZE = 'initialize';
    self.UPDATE = 'update';
    self.CODE_ATTRIBUTES = [self.INITIALIZE, self.UPDATE];
    self.ATTRIBUTES = 'attributes';

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

  setValue(text) {
    var cursorPosition = this.editor.getCursorPosition();
    this.editor.setValue(text);
    this.editor.moveCursorToPosition(cursorPosition);
    this.editor.clearSelection();
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
