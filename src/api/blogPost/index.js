/** @format */

import express from "express"
import createHttpError from "http-errors"
import BlogPostsModel from "./model.js"
import q2m from "query-to-mongo"

const blogPostsRouter = express.Router()

blogPostsRouter.post("/", async (req, res, next) => {
  try {
    const newBlogPosts = new BlogPostsModel(req.body) // here it happens the validation (thanks to Mongoose) of request body, if it is not ok Mongoose will throw an error (if it is ok it is NOT saved yet)
    const { _id } = await newBlogPosts.save()

    res.status(201).send({ _id })
  } catch (error) {
    next(error)
  }
})

// blogPostsRouter.get("/", async (req, res, next) => {
//   try {
//     const blogPosts = await BlogPostsModel.find()
//     res.send(blogPosts)
//   } catch (error) {
//     next(error)
//   }
// })
blogPostsRouter.get("/", async (req, res, next) => {
  try {
    const mongoQuery = q2m(req.query)
    const totalBlogPosts = await BlogPostsModel.countDocuments(
      mongoQuery.criteria
    )
    const blogPosts = await BlogPostsModel.find(
      mongoQuery.criteria,
      mongoQuery.options.fields
    )
      .limit(mongoQuery.options.limit)
      .skip(mongoQuery.options.skip)
      .sort(mongoQuery.options.sort)
      .populate({ path: "authors", select: "firstName lastName" }) //http://localhost:3001/blogPosts?title=Windows Internals1
    // return { totalBlogPosts, blogPosts }
    res.send({
      links: mongoQuery.links(
        "http://localhost:3001/blogPosts",
        totalBlogPosts
      ),
      totalBlogPosts,
      totalPages: Math.ceil(totalBlogPosts / mongoQuery.options.limit),
      blogPosts,
    })
  } catch (error) {
    next(error)
  }
})

// blogPostsRouter.get("/", async (req, res, next) => {
//   try {
//     const mongoQuery = q2m(req.query)
//     const { totalBlogPosts, blogPosts } =
//       await BlogPostsModel.findBlogWithAuthors(mongoQuery).populate({
//         path: "authors",
//         select: "firstName lastName",
//       })

//     res.send({
//       links: mongoQuery.links(
//         "http://localhost:3001/blogPosts",
//         totalBlogPosts
//       ),
//       totalBlogPosts,
//       totalPages: Math.ceil(totalBlogPosts / mongoQuery.options.limit),
//       blogPosts,
//     })
//     //res.send(blogPosts)
//     console.log("TOTAL BLOG POSTS: ", totalBlogPosts)
//     console.log("FIND BLOG POSTS: ", blogPosts)
//   } catch (error) {
//     next(error)
//   }
// })

blogPostsRouter.get("/:postId", async (req, res, next) => {
  try {
    const blogPost = await BlogPostsModel.findById(req.params.postId).populate({
      path: "authors",
      //select: "firstName lastName",
    })
    if (blogPost) {
      res.send(blogPost)
    } else {
      next(
        createHttpError(
          404,
          `Blog Post with id ${req.params.postId} not found!`
        )
      )
    }
  } catch (error) {
    next(error)
  }
})

blogPostsRouter.put("/:postId", async (req, res, next) => {
  try {
    const blogPosts = await BlogPostsModel.findByIdAndUpdate(
      req.params.postId, // WHO you want to modify
      req.body, // HOW you want to modify
      { new: true, runValidators: true }
    )

    if (blogPosts) {
      res.send(blogPosts)
    } else {
      next(createHttpError(404, `User with id ${req.params.postId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

blogPostsRouter.delete("/:postId", async (req, res, next) => {
  try {
    const deleteBlogPost = await BlogPostsModel.findByIdAndDelete(
      req.params.postId
    )
    if (deleteBlogPost) {
      res.status(204).send()
    } else {
      next(createHttpError(404, `User with id ${req.params.postId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

blogPostsRouter.post("/:postId/comments", async (req, res, next) => {
  try {
    const blogPostId = await BlogPostsModel.findById(req.body.postId, {
      _id: 0,
    })
    console.log(blogPostId)
    if (blogPostId) {
      const commentToInsert = {
        ...blogPostId.toObject(),
        ...req.body,
        created_At: new Date(),
      }
      console.log(commentToInsert)

      const updatedBlogPost = await BlogPostsModel.findByIdAndUpdate(
        req.params.postId, // WHO
        { $push: { commentHistory: commentToInsert } }, // HOW
        { new: true, runValidators: true } // OPTIONS
      )
      if (updatedBlogPost) {
        res.send(updatedBlogPost)
      } else {
        next(
          createHttpError(
            404,
            `Blog post with id ${req.params.postId} not found!`
          )
        )
      }
    } else {
      // 4. In case of book not found --> 404
      next(
        createHttpError(404, `Comment with id ${req.body.postId} not found!`)
      )
    }
  } catch (error) {
    next(error)
  }
})

blogPostsRouter.get("/:postId/comments", async (req, res, next) => {
  try {
    const blogPostId = await BlogPostsModel.findById(req.params.postId)
    if (blogPostId) {
      res.send(blogPostId.commentHistory)
    } else {
      next(
        createHttpError(
          404,
          `Blog post with id ${req.params.postId} not found!`
        )
      )
    }
  } catch (error) {
    next(error)
  }
})
blogPostsRouter.get("/:postId/comments/:commentId", async (req, res, next) => {
  try {
    const blogPostId = await BlogPostsModel.findById(req.params.postId)
    if (blogPostId) {
      const commentById = blogPostId.commentHistory.find(
        (comment) => comment._id.toString() === req.params.commentId
      )
      if (commentById) {
        res.send(commentById)
      } else {
        next(
          createHttpError(
            404,
            `Comment with id ${req.params.commentId} not found!`
          )
        )
      }
    } else {
      next(
        createHttpError(
          404,
          `Blog Post with id ${req.params.postId} not found!`
        )
      )
    }
  } catch (error) {
    next(error)
  }
})

blogPostsRouter.put("/:postId/comments/:commentId", async (req, res, next) => {
  try {
    // 1. Find user by id (obtaining a MONGOOSE DOCUMENT)
    const blogPostId = await BlogPostsModel.findById(req.params.postId)

    if (blogPostId) {
      // 2. Update the item in the array by using normal JS code
      // 2.1 Search for the index of the product into the purchaseHistory array

      const index = blogPostId.commentHistory.findIndex(
        (comment) => comment._id.toString() === req.params.commentId
      )

      if (index !== -1) {
        // 2.2 Modify that product
        blogPostId.commentHistory[index] = {
          ...blogPostId.commentHistory[index].toObject(),
          ...req.body,
        }

        // 3. Since the blogPostId object is a MONGOOSE DOCUMENT I can then use .save() to update that record
        await blogPostId.save()
        res.send(blogPostId)
      } else {
        next(
          createHttpError(
            404,
            `Book with id ${req.params.commentId} not found!`
          )
        )
      }
    } else {
      next(createHttpError(404, `User with id ${req.params.postId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

blogPostsRouter.delete(
  "/:postId/comments/:commentId",
  async (req, res, next) => {
    try {
      const updateBlogPost = await BlogPostsModel.findByIdAndUpdate(
        req.params.postId, // WHO
        { $pull: { commentHistory: { _id: req.params.commentId } } }, // HOW
        { new: true, runValidators: true } // OPTIONS
      )
      if (updateBlogPost) {
        res.send(updateBlogPost)
      } else {
        next(
          createHttpError(404, `User with id ${req.params.postId} not found!`)
        )
      }
    } catch (error) {
      next(error)
    }
  }
)
export default blogPostsRouter
