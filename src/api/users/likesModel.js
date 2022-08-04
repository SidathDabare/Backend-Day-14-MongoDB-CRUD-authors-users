/** @format */

import mongoose from "mongoose"

const { Schema, model } = mongoose

const likeSchema = new Schema(
  {
    user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    status: { type: String, required: true, enum: ["Active", "Paid"] },
    blog: [
      {
        postId: { type: mongoose.Types.ObjectId, ref: "BlogPost" },
      },
    ],
  },
  {
    timestamps: true,
  }
)

export default model("Like", likeSchema)
