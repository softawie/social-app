# 📝 Post Module API Guide

## 🚀 Quick Start

The post module is now fully integrated and available at `/api/posts/*` endpoints.

## 🔐 Authentication

Most endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 📡 Available Endpoints

### **Public Endpoints**
```http
GET /api/posts                    # Get all public posts
GET /api/posts/:id                # Get single post
GET /api/posts/:postId/comments   # Get comments for a post
```

### **Protected Endpoints**

#### **Post Management**
```http
POST /api/posts                   # Create new post
PUT /api/posts/:id                # Update post (owner only)
DELETE /api/posts/:id             # Delete post (owner/admin)
```

#### **Interactions**
```http
POST /api/posts/like              # Like/unlike a post
POST /api/posts/comments          # Create comment
PUT /api/posts/comments/:commentId    # Update comment (owner only)
DELETE /api/posts/comments/:commentId # Delete comment (owner/admin)
```

#### **Moderation**
```http
POST /api/posts/report            # Report a post
GET /api/posts/stats/global       # Global stats (admin only)
GET /api/posts/stats/user         # User's post stats
```

## 📋 Request Examples

### **Create Post**
```json
POST /api/posts
{
  "content": "Hello world! This is my first post.",
  "images": ["https://example.com/image1.jpg"],
  "tags": ["hello", "first-post"],
  "visibility": "public",
  "location": {
    "name": "New York",
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

### **Get Posts with Filters**
```http
GET /api/posts?page=1&limit=10&sortBy=createdAt&sortOrder=desc&visibility=public&search=hello
```

### **Like a Post**
```json
POST /api/posts/like
{
  "postId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

### **Create Comment**
```json
POST /api/posts/comments
{
  "postId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "content": "Great post!",
  "parentCommentId": "60f7b3b3b3b3b3b3b3b3b3b4"  // Optional for replies
}
```

### **Report Post**
```json
POST /api/posts/report
{
  "postId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "reason": "spam",
  "description": "This post contains spam content"
}
```

## 🎯 Enum Values

### **Post Visibility**
- `public` - Visible to everyone
- `private` - Only visible to author
- `friends` - Visible to friends only

### **Sort Options**
- `createdAt` - Sort by creation date
- `updatedAt` - Sort by last update
- `likes` - Sort by number of likes
- `comments` - Sort by number of comments

### **Sort Order**
- `asc` - Ascending order
- `desc` - Descending order

### **Report Reasons**
- `spam` - Spam content
- `harassment` - Harassment or bullying
- `hate_speech` - Hate speech
- `violence` - Violence or threats
- `nudity` - Inappropriate nudity
- `false_information` - Misinformation
- `copyright` - Copyright violation
- `other` - Other reasons

## 🔒 Authorization Levels

1. **Public** - No authentication required
2. **Authenticated** - Valid JWT token required
3. **Owner** - Must be the creator of the content
4. **Admin** - Admin role required

## 📊 Response Format

All responses follow this format:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "pagination": { /* pagination info for list endpoints */ }
}
```

## 🚨 Error Handling

Errors return appropriate HTTP status codes with descriptive messages:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ /* validation errors if applicable */ ]
}
```

## 🧪 Testing

1. **Start your server**: The post routes are automatically loaded
2. **Get a JWT token**: Use your auth endpoints to login
3. **Test endpoints**: Use Postman, curl, or your preferred API client
4. **Check logs**: Monitor the logs viewer at `/logs-viewer`

## 🎉 Features Included

- ✅ Full CRUD operations for posts
- ✅ Nested comments with replies
- ✅ Like/unlike system
- ✅ Content reporting and moderation
- ✅ Privacy controls (public/private/friends)
- ✅ Image attachments support
- ✅ Tagging system
- ✅ Location support
- ✅ Search and filtering
- ✅ Pagination
- ✅ Statistics and analytics
- ✅ Comprehensive authorization
- ✅ Input validation
- ✅ Error handling

Happy coding! 🚀
