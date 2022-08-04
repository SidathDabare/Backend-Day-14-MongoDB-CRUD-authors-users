/** @format */

import mongoose from "mongoose"

const { Schema, model } = mongoose

const blogPostsSchema = new Schema(
  {
    category: { type: String, required: true },
    title: { type: String, required: true },
    cover: { type: String, required: true },
    professions: [String],
    readTime: {
      value: { type: Number },
      unit: { type: String },
    },
    authors: [{ type: Schema.Types.ObjectId, ref: "Author" }],
    content: { type: String, required: false },
    commentHistory: [{ comment: String, rate: Number, created_At: Date }],
  },
  {
    timestamps: true,
  }
)
// *************************************************** CUSTOM METHOD *****************************************************

blogPostsSchema.static("findBlogWithAuthors", async function (query) {
  // If I use an arrow function here, "this" will be undefined. If I use a traditional function, "this" will refer to BooksModel itself
  console.log("THIS: ", this)
  const totalBlogPosts = await this.countDocuments(query.criteria)
  const blogPosts = await this.find(query.criteria, query.options.fields)
    .limit(query.options.limit) // no matter the order of usage of these three methods, Mongo will ALWAYS apply SORT then SKIP then LIMIT in this order
    .skip(query.options.skip)
    .sort(query.options.sort)
    .populate({ path: "authors", select: "firstName lastName" })
  return { totalBlogPosts, blogPosts }
})

export default model("blogPosts", blogPostsSchema)
