"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import TipTapMenuBar from "./TipTapMenuBar";
import { Button } from "./ui/button";
import { useDebounce } from "@/lib/useDebounce";
import { useMutation } from "@tanstack/react-query";
import { Text } from "@tiptap/extension-text";
import { NoteType } from "@/lib/db/schema";
import axios from "axios";
import { useCompletion } from "ai/react";

type Props = { note: NoteType };

const TipTapEditor = ({ note }: Props) => {
  const [editorState, setEditorState] = useState(
    note.editorState || `<h1>${note.name}</h1>`
  );

  const { complete, completion } = useCompletion({
    api: "/api/completion",
  });

  const saveNote = useMutation({
    mutationFn: async () => {
      const response = await axios.post("/api/saveNote", {
        noteId: note.id,
        editorState,
      });
      return response.data;
    },
  });

  const customText = Text.extend({
    addKeyboardShortcuts() {
      return {
        "Shift-a": () => {
          //  Take the last 30 words
          const prompt = this.editor.getText().split(" ").slice(-30).join(" ");
          complete(prompt);
          return true;
        },
      };
    },
  });

  const editor = useEditor({
    autofocus: true,
    extensions: [StarterKit, customText],
    content: editorState,
    onUpdate: ({ editor }) => {
      setEditorState(editor.getHTML());
    },
  });

  const lastCompletion = useRef("");

  useEffect(() => {
    if (!editor || !editor) return;
    // Get individual word so that we can insert into the editor
    const diff = completion.slice(lastCompletion.current.length);
    lastCompletion.current = completion;
    editor?.commands.insertContent(diff);
  }, [completion, editor]);

  const debouncedState = useDebounce(editorState, 500);

  useEffect(() => {
    // Save to db
    if (debouncedState === "") return;

    saveNote.mutate(undefined, {
      onSuccess: (data) => {
        console.log("success update!", data);
      },
      onError: (err) => {
        console.error(err);
      },
    });
  }, [debouncedState]);

  return (
    <>
      <div className="flex">
        {editor && <TipTapMenuBar editor={editor} />}
        <Button disabled variant={"outline"}>
          {saveNote.isPending ? "Saving..." : "Saved"}
        </Button>
      </div>

      <div className="prose">
        <EditorContent editor={editor} />
      </div>
    </>
  );
};

export default TipTapEditor;
