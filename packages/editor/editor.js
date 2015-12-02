// based on http://adndevblog.typepad.com/cloud_and_mobile/2015/07/embedding-webpages-in-a-3d-threejs-scene.html

Editor = class Editor {
  constructor(editorSelector) {
    var self = this;
    self.isActive = false;
    self.editorSelector = editorSelector;
    self.isLoaded = false;
    AceEditor.instance('editor', {
      theme: 'dawn',
      mode: 'javascript'
    }, (editor) => {
      self.editor = editor;
      self.isLoaded = true;
    });
    $(this.editorSelector).hide();

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

};
