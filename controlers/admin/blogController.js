const Blog = require("../../models/blog");

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase().trim();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return fallback;
};

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((t) => String(t).trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

const ensureUniqueSlug = async (baseSlugInput, excludeId) => {
  const baseSlug = baseSlugInput || "blog";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Blog.findOne(
      excludeId ? { slug, _id: { $ne: excludeId } } : { slug },
    );

    if (!existing) return slug;

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

exports.addBlog = async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      author,
      tags,
      metaTitle,
      metaDescription,
      metaKeywords,
      isPublished,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const image = req.files?.image?.[0]?.filename
      ? `/assets/uploads/${req.files.image[0].filename}`
      : null;

    const baseSlug = slugify(slug || title);
    const finalSlug = await ensureUniqueSlug(baseSlug);
    const publishFlag = parseBoolean(isPublished, true);

    const blog = await Blog.create({
      title,
      slug: finalSlug,
      excerpt,
      content,
      author,
      tags: parseTags(tags),
      metaTitle,
      metaDescription,
      metaKeywords,
      image,
      isPublished: publishFlag,
      publishedAt: publishFlag ? new Date() : null,
    });

    return res.status(201).json({
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.editBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const {
      title,
      slug,
      excerpt,
      content,
      author,
      tags,
      metaTitle,
      metaDescription,
      metaKeywords,
      isPublished,
    } = req.body;

    if (title !== undefined) blog.title = title;
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (content !== undefined) blog.content = content;
    if (author !== undefined) blog.author = author;
    if (metaTitle !== undefined) blog.metaTitle = metaTitle;
    if (metaDescription !== undefined) blog.metaDescription = metaDescription;
    if (metaKeywords !== undefined) blog.metaKeywords = metaKeywords;

    if (tags !== undefined) {
      blog.tags = parseTags(tags);
    }

    if (slug !== undefined || title !== undefined) {
      const baseSlug = slugify(slug || title || blog.title);
      blog.slug = await ensureUniqueSlug(baseSlug, blog._id);
    }

    const publishFlag = parseBoolean(isPublished, blog.isPublished);
    if (publishFlag !== blog.isPublished) {
      blog.isPublished = publishFlag;
      blog.publishedAt = publishFlag ? new Date() : null;
    }

    if (publishFlag && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }

    if (req.files?.image?.[0]?.filename) {
      blog.image = `/assets/uploads/${req.files.image[0].filename}`;
    }

    await blog.save();

    return res.status(200).json({
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getBlogs = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status === "published") filter.isPublished = true;
    if (status === "draft") filter.isPublished = false;

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const blogs = await Blog.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Blogs fetched successfully",
      data: blogs,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    return res.status(200).json({ data: blog });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
