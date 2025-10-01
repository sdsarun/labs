import { memo, useMemo } from "react";
import { EditorContent, EditorContext, type EditorContextValue, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";

type EditorProps = React.PropsWithChildren;

// DON'T: render the editor in the same component as other components
// DO: isolate the editor in a separate component
const Editor = memo<EditorProps>(({ children }) => {
  const editor = useEditor({
    /**
     * To configure Tiptap, specify three key elements:
        - where it should be rendered (element)
          - Note: This is not required if you use the React or Vue integrations.
        - which functionalities to enable (extensions)
        - what the initial document should contain (content)
     */
    extensions: [
      StarterKit,
      Mention.configure({
        // deleteTriggerWithBackspace: true,
        suggestions: [
          {
            char: "$",
          }
        ]
      })
    ], // required
    content: "", // required
    // place the cursor in the editor after initialization
    autofocus: true,
    // make the text editable (default is true)
    editable: true,
    // prevent loading the default ProseMirror CSS that comes with Tiptap
    // should be kept as `true` for most cases as it includes styles
    // important for Tiptap to work correctly
    injectCSS: true
  });

  const providerValue = useMemo<EditorContextValue>(() => ({ editor }), [editor]);

  console.count("editor render");

  return (
    <EditorContext value={providerValue}>
      <EditorContent editor={editor} />
      {children}
    </EditorContext>
  );
});

export { Editor };
