# ✅ Quick Test: Tabs & Category Management

## 🎯 Cách Tạo Danh Mục Mới

### Bước 1: Mở Trang
```
Mở: UI/AdminMenuManagement.html
```

### Bước 2: Chuyển Tab
```
Bạn sẽ thấy 3 tabs phía trên:
┌─────────────────────────────────────────┐
│ [Món Ăn] [Danh Mục] [Topping]          │
│                                         │
│ [Lọc theo danh mục ▼]  [+ Thêm Món]    │
└─────────────────────────────────────────┘

Click vào tab "Danh Mục"
```

### Bước 3: Nút Sẽ Đổi Text
```
Sau khi click tab "Danh Mục":
┌─────────────────────────────────────────┐
│ [Món Ăn] [Danh Mục] [Topping]          │
│          ^^^^^^^^^^^                    │
│          (Active - màu cam)             │
│                                         │
│ [Lọc ▼]            [+ Thêm Danh Mục]   │
│                     ^^^^^^^^^^^^^^^^^   │
│                     (Text đã đổi!)      │
└─────────────────────────────────────────┘
```

### Bước 4: Click Nút
```
Click "Thêm Danh Mục"
→ Modal sẽ hiện ra với form:
  - Tên danh mục (*)
  - Mô tả
  - [Hủy] [Thêm Mới]
```

### Bước 5: Điền Form & Submit
```
1. Nhập tên: "Sinh Tố"
2. Nhập mô tả: "Các loại sinh tố tươi ngon"
3. Click "Thêm Mới"
4. Toast notification: "Thêm danh mục mới thành công!"
5. Table reload → Thấy danh mục mới
```

## 🔍 Nếu Tabs Không Hiện

### Check 1: View Source
```
Right-click page → View Page Source
Search for: "view-tabs"

Should see:
<div class="view-tabs">
  <button class="tab-btn active" data-view="items">
    <i class="fa-solid fa-utensils"></i> Món Ăn
  </button>
  ...
</div>
```

### Check 2: Inspect Element
```
Right-click trên page → Inspect
Tìm element: <div class="dash-actions-bar">
Should contain: <div class="view-tabs">
```

### Check 3: CSS Loading
```
F12 → Network tab
Reload page
Check:
✅ style.css - loaded?
✅ AdminMenuManagement.css - loaded?
```

### Check 4: Console
```
F12 → Console
Should see:
"Attaching tab event listeners..."
"Found 3 tab buttons"
"Tab event listeners attached"
```

## 📸 Visual Guide

### Initial State (Tab "Món Ăn" active)
```
┌─────────────────────────────────────────────────────┐
│ CAFE 24/7                                           │
│ ┌───────────────────────────────────────────────┐   │
│ │ [Món Ăn*] [Danh Mục] [Topping]               │   │
│ │                                               │   │
│ │ [Tất cả danh mục ▼]  [+ Thêm Món Mới]        │   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ Table: Danh sách món ăn                             │
└─────────────────────────────────────────────────────┘
```

### After Click "Danh Mục" Tab
```
┌─────────────────────────────────────────────────────┐
│ CAFE 24/7                                           │
│ ┌───────────────────────────────────────────────┐   │
│ │ [Món Ăn] [Danh Mục*] [Topping]               │   │
│ │                                               │   │
│ │ [Tất cả ▼]           [+ Thêm Danh Mục]       │   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ Table: Danh mục (với cột: Tên, Mô tả, Số món)      │
└─────────────────────────────────────────────────────┘
```

### After Click "Topping" Tab
```
┌─────────────────────────────────────────────────────┐
│ CAFE 24/7                                           │
│ ┌───────────────────────────────────────────────┐   │
│ │ [Món Ăn] [Danh Mục] [Topping*]               │   │
│ │                                               │   │
│ │ [Tất cả ▼]           [+ Thêm Topping]        │   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ Table: Topping (với cột: Tên, Giá)                 │
└─────────────────────────────────────────────────────┘
```

## 🎨 Tab Styling

### Active Tab (Cam)
- Background: Orange gradient
- Text: White
- Border: Orange
- Box shadow: Orange glow

### Inactive Tab (Dark)
- Background: Transparent dark
- Text: Muted gray (#b6a8a2)
- Border: Dark transparent

### Hover State
- Background: Lighter
- Text: White
- Smooth transition

## 🧪 Test Each Function

### Test 1: Tab Switching
```
✅ Click "Món Ăn" → Shows items table
✅ Click "Danh Mục" → Shows categories table
✅ Click "Topping" → Shows toppings table
✅ Active tab has orange background
✅ Button text changes correctly
```

### Test 2: Add Category
```
✅ Click "Danh Mục" tab
✅ Click "Thêm Danh Mục" button
✅ Modal appears with dark theme
✅ Form has: Tên danh mục*, Mô tả
✅ Submit → Success toast
✅ Modal closes
✅ Table reloads with new category
```

### Test 3: Edit Category
```
✅ Click edit icon (pen) on a category
✅ Modal appears with filled data
✅ Change values
✅ Submit → Success toast
✅ Table updates
```

### Test 4: Delete Category
```
✅ Click delete icon (trash) on a category
✅ Confirm dialog appears
✅ Confirm → Success toast
✅ Category removed from table
```

## 📝 Expected Behavior

| Action | Expected Result |
|--------|----------------|
| Page Load | Tab "Món Ăn" active, button shows "Thêm Món Mới" |
| Click "Danh Mục" | Tab becomes orange, button shows "Thêm Danh Mục", table shows categories |
| Click "Topping" | Tab becomes orange, button shows "Thêm Topping", table shows toppings |
| Click Add Button | Modal opens with appropriate form |
| Submit Form | Toast notification, modal closes, table reloads |
| Click Edit | Modal opens with filled data |
| Click Delete | Confirm dialog, then delete on confirm |

## 🚨 Common Issues

### Issue: Tabs không thấy
**Solution**: Check HTML có `<div class="view-tabs">` không

### Issue: Tabs thấy nhưng không click được
**Solution**: Check Console có "Tab event listeners attached" không

### Issue: Click tab không đổi nội dung
**Solution**: Check Console có "Tab clicked: categories" không

### Issue: Button không đổi text
**Solution**: Check Console có "Add button found" không

## ✅ Files Updated

1. **UI/AdminMenuManagement.html**
   - Added tabs directly in HTML (no JS injection)
   - Tabs always visible

2. **Back/AdminMenuManagement.js**
   - Simplified tab attachment (no creation)
   - Better error logging

Now test again! 🚀
