import mongoose, { Schema } from "mongoose";

const NoteSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      validate: {
        validator: function (value: string) {
          return value !== value.toUpperCase();
        },
        message: "Title must not be entirely uppercase",
      },
    },
    content: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const NoteModel = mongoose.model("Note", NoteSchema);

export default NoteModel;
