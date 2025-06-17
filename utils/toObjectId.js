import mongoose from "mongoose";

// The notion: "new mongoose.Types.ObjectId(inputId)" will returns the warning:
// The signature '(inputId: number): ObjectId' of 'mongoose.Types.ObjectId' is deprecated. [6387]
// Because it can't be sure that inputId isn't a number because this is fucking JS, where type assertion isn't allowed.
// This function just adds a type check before converting so that my lsp can stop screaming at me about a deprecated function that I don't use.
// This is especially *funny* because this is only needed when doing aggregate (which will be used, like, twice in the entire project) because mongoose won't auto convert when aggregating.
// Thanks, JS
export default function toObjectId(id) {
  if (typeof id !== "string") {
    throw new Error("Expected a string for ObjectId");
  }
  return new mongoose.Types.ObjectId(id);
}
