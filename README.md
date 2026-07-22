https://e-shop-1-m034.onrender.com/swagger-ui/index.html (test API)
https://admin-e-shop-6cfm.vercel.app/ (frontend)
# Service Layer Implementation Documentation

This document provides a comprehensive overview of all service implementation classes in the `com.example.learning_spring_security.Service.ServiceImplement` package.  
These classes form the core business logic layer, handling operations for user management, products, orders, payments, refunds, returns, permissions, and more.

## Architecture Overview

- **Patterns**: Each service implements a corresponding interface from `ServiceStructure`.  
- **DTOs**: Incoming requests are mapped via DTOs (`dto.Request`), and outgoing responses are wrapped in `ResponseErrorTemplate` (a standard envelope with status code, message, and payload).  
- **Mappers**: Entity ↔ DTO conversions are handled by dedicated mapper classes (e.g., `AddressMapper`, `ProductMapper`).  
- **Transactions**: All write operations are annotated with `@Transactional`; read-only operations use `@Transactional(readOnly = true)` for performance optimisation.  
- **Exceptions**: Custom exceptions (e.g., `ResourceNotFoundException`, `BadRequestException`) are thrown for error handling and later caught by global exception handlers.

---

## 1. AddressServiceImpl

**Purpose**: Manages user addresses (CRUD, default address handling).  

**Key Dependencies**:  
- `AddressRepository`, `UserRepository`  

**Main Methods**:  
- `createAddress(AddressRequest, Long userId)`: Creates a new address, associates it with the user. If `isDefault` is true, resets any existing default for that user.  
- `getAddressById(Long id)`: Retrieves an address by its ID.  
- `getUserAddresses(Long userId, Pageable)` / `List` version: Fetches addresses for a user (currently pageable method returns empty page – potential bug).  
- `updateAddress(Long id, AddressRequest, Long userId)**: Updates address; checks ownership; if setting as default, resets other defaults.  
- `deleteAddress(Long id, Long userId)**: Soft-deletes (sets `deleted=true`) and removes from user's collection.  
- `setDefaultAddress(Long addressId, Long userId)**: Resets defaults and marks given address as default.  
- `getDefaultAddress(Long userId)**: Returns the default address for the user.

**Notable**: Uses `addressRepository.isUserHasAddress(...)` for ownership verification.

---

## 2. AuthServiceImpl

**Purpose**: Handles authentication, registration, email verification, password reset, and token management (JWT + refresh tokens).  

**Key Dependencies**:  
- `UserRepository`, `RoleRepository`, `RefreshTokenRepository`, `PasswordResetTokenRepository`  
- `PasswordEncoder`, `AuthenticationManager`, `JwtService`, `EmailService`  
- `GroupRepository`, `UserGroupRepository`, `FunctionPermissionRepository`, `UserPermissionRepository`  

**Main Methods**:  
- `create(Register)`: Registers a new user with default role ("USER"), assigns default group ("USR"), grants default permissions (e.g., `CART_ADD_ITEM`, `ORDER_CREATE`), sends verification code via email.  
- `verifyUser(VerifyUserDto)`: Validates verification code, enables user account, generates access/refresh tokens.  
- `resendVerificationCode(String email)`: Generates new verification code and resends email.  
- `authenticate(Login)`: Authenticates using `AuthenticationManager`; on failure increments `attempt`; on success resets attempts and returns tokens.  
- `refreshToken(RefreshTokenRequest)`: Validates refresh token, issues new access token and new refresh token.  
- `logout(RefreshTokenRequest)`: Deletes refresh token.  
- `forgotPassword(ForgotPasswordRequest)`: Creates a password reset token and sends reset link (does not reveal if email exists for security).  
- `resetPassword(ResetPasswordRequest)`: Validates token and updates password.

**Notable**: During registration, the user is automatically assigned to a default group and given a set of default permissions, ensuring baseline functionality for new users.

---

## 3. CancelationQueryServiceImpl

**Purpose**: Provides query operations for order cancellations (summaries, list, details).  

**Key Dependencies**:  
- `OrderCancelationRepository`, `OrderRepository`  

**Main Methods**:  
- `getCancelationSummary()`: Returns summary statistics (total cancellations, cancellation rate).  
- `getCancelationList(GetCancelationListRequest)`: Paginated search with filters (order number, customer name, reason, status, date range, amount range).  
- `getCancelationDetail(String orderNo)**: Fetches detailed info for a specific cancellation.

**Notable**: Uses specification/JPQL queries defined in the repository. Validates date and amount ranges.

---

## 4. CartServiceImpl

**Purpose**: Manages shopping cart operations for a user.  

**Key Dependencies**:  
- `CartRepository`, `CartItemRepository`, `UserRepository`, `ProductSkuRepository`  

**Main Methods**:  
- `getCartByUserId(Long userId)`: Retrieves cart with items.  
- `addItemToCart(Long userId, CartRequest)`: Adds a product SKU to cart; if already present, increments quantity; recalculates totals.  
- `updateCartItem(Long userId, Long cartItemId, CartRequest)`: Updates quantity; if quantity <= 0, removes item.  
- `removeItemFromCart(...)`: Removes a specific item.  
- `clearCart(Long userId)`: Deletes all items and resets totals.  
- `getOrCreateCart(Long userId)**: Returns existing cart or creates a new one.  

**Notable**: Uses `getOrCreateCartEntity` to always have a cart. Updates totals (total price and total items) after each modification.

---

## 5. CategoryIconServiceImpl

**Purpose**: Manages category icons (upload, retrieval, deletion).  

**Key Dependencies**:  
- `CategoryIconRepository`, `ImageServiceImpl`  

**Main Methods**:  
- `uploadIcon(String name, MultipartFile file)`: Uploads image via `ImageService`, saves icon URL.  
- `getIconById(Long id)`: Retrieves icon.  
- `getAllIcons()`: Returns list of all icons.  
- `deleteIcon(Long id)`: Deletes icon.

**Notable**: The icon is stored as a URL string (no separate image entity, only URL).

---

## 6. CategoryServiceImpl

**Purpose**: Manages product categories.  

**Key Dependencies**:  
- `CategoryRepository`, `ImageService`, `CategoryIconRepository`  

**Main Methods**:  
- `createCategory(CategoryRequest)`: Creates a new category; if iconId is provided, sets the icon URL.  
- `getCategoryById`, `getCategoryByName`, `getAllCategories` (paginated and list).  
- `updateCategory(Long id, CategoryRequest)`: Updates category; checks name uniqueness.  
- `deleteCategory(Long id)`: Soft-delete (sets `deleted=true`).  
- `uploadCategoryIcon(Long id, MultipartFile)`: Uploads an image and sets it as category icon.  
- `getCategoryWithSubCategories(Long id)`: Retrieves category with its sub-categories.

**Notable**: The icon is stored as a URL string on the category entity, separate from `CategoryIcon` entity.

---

## 7. EmailNotificationService

**Purpose**: Sends various types of emails (simple text, HTML, order confirmations, shipping, cancellations).  

**Key Dependencies**:  
- `JavaMailSender`  

**Main Methods**:  
- `sendSimpleEmail`, `sendHtmlEmail`, `sendEmailToMultiple` – generic methods.  
- `sendOrderConfirmationEmail`, `sendOrderShippedEmail`, `sendOrderCancellationEmail` – specialised for order events.

**Notable**: Uses `@Value` for `fromEmail`. All methods are synchronous; exceptions are caught and re-thrown as `RuntimeException`.

---

## 8. EmailService

**Purpose**: Sends verification and password reset emails (async).  

**Key Dependencies**:  
- `JavaMailSender`  

**Main Methods**:  
- `sendVerificationEmail(String to, String subject, String htmlMessage)` – synchronous.  
- `sendVerificationCodeEmail(String toEmail, String code)` – async, sends HTML email with verification code.  
- `sendPasswordResetEmail(String toEmail, String token)` – async, sends reset link.  

**Notable**: Uses `@Async` for non‑blocking email delivery. Builds HTML bodies with embedded styling.

---

## 9. FunctionPermissionServiceImpl

**Purpose**: CRUD operations for function permissions (system permissions).  

**Key Dependencies**:  
- `FunctionPermissionRepository`  

**Main Methods**:  
- `getFunctions(GetFunctionPermissionRequest)`: Paginated search with filters (by name, module, active status, etc.).  
- `getFunctionById(Long funcId)`.  
- `createFunction(String funcCode, String funcName, String description, String module)`: Ensures unique `funcCode`.  
- `updateFunction(Long funcId, String funcName, String description, Boolean isActive)`.  
- `deleteFunction(Long funcId)` – hard delete.

**Notable**: Generates `funcId` as `maxId+1` (manual ID assignment). Supports multiple filter types.

---

## 10. GroupPermissionServiceImpl

**Purpose**: Manages permissions assigned to groups (many-to-many between `Group` and `FunctionPermission`).  

**Key Dependencies**:  
- `GroupPermissionRepository`  

**Main Methods**:  
- `getGroupPermissions(GetGroupPermissionRequest)`: Paginated search with filters (by groupId, funcId, both, active status).  
- `createGroupPermission(Long groupId, Long funcId)`: Creates association; checks uniqueness.  
- `updateGroupPermission(Long groupPermissionId, Boolean isActive)`: Toggles active state.  
- `deleteGroupPermission(Long groupPermissionId)`: Hard delete.

**Notable**: The `GroupPermission` entity links `groupId` and `funcId`.

---

## 11. GroupServiceImpl

**Purpose**: Manages user groups (permission groups).  

**Key Dependencies**:  
- `GroupRepository`  

**Main Methods**:  
- `createGroup(GroupRequest)`: Creates a group with auto-generated unique `groupCode` (based on name).  
- `getAllGroups(Pageable)`, `getGroupById(Long id)`.  
- `updateGroup(Long id, GroupRequest)`: Updates name, description, status, active flag.  
- `deleteGroup(Long id)`: Soft-delete (sets `isDelete=true`, `isActive=false`).  
- `toggleGroupActive(Long id, Boolean isActive)`.

**Notable**: `groupCode` is generated from the name with uniqueness suffix.

---

## 12. InventoryServiceImpl

**Purpose**: Manages inventory for product SKUs, including stock movements and summaries.  

**Key Dependencies**:  
- `InventoryRepository`, `ProductSkuRepository`, `StockMovementRepository`  

**Main Methods**:  
- `createInventory(Long productSkuId, InventoryRequest)`: Creates inventory record; records initial stock movement.  
- `getInventoryById`, `getInventoryBySkuId`, `getAllInventory`, `getInventoryByProductId`, `getLowStockInventory`.  
- `restock(Long id, RestockRequest)`: Increases stock and records movement.  
- `adjustQuantity(Long id, InventoryRequest)`: Updates quantity and records adjustment.  
- `deleteInventory(Long id)`: Hard delete.  
- `reduceStock(Long productSkuId, Long quantity)`: Decrements stock (used when order placed).  
- `increaseStock(Long productSkuId, Long quantity)`: Increments stock (used on order cancellation or return).  
- `getLowStockSkus()`, `getLowStockSkusByProductId(Long productId)`: Queries for low-stock SKUs.  
- `getInventorySummary()`: Returns aggregate statistics.  
- `searchInventory(String search, String warehouse, String status, Pageable)`: Flexible search.  
- `getInventoryHistory(Long inventoryId, Pageable)`: Paginated stock movement history.

**Notable**: All stock changes are logged via `StockMovement` entity, including previous/new quantities and performer (username from security context).

---

## 13. OrderServiceImpl

**Purpose**: Core order processing, including creation from cart, status updates, cancellation, and integration with Bakong (KHQR) payment.  

**Key Dependencies**:  
- `OrderRepository`, `UserRepository`, `CartRepository`, `AddressRepository`, `InventoryRepository`, `InventoryService`  
- `BakongService`, `PaymentTransactionService`, `EmailNotificationService`  

**Main Methods**:  
- `createOrderFromCart(Long userId, OrderRequest)`: Converts cart to order, reduces inventory, creates payment record, sends confirmation email. If payment method is KHQR (Bakong/ABA/ACLEDA), generates QR and returns with payment URL.  
- `getOrders(GetOrderRequest)`: Paginated search with filters (by user, status, date range).  
- `getOrderById`, `getOrderByNumber`, `getUserOrders`, `getAllOrders`.  
- `updateOrderStatus(Long id, String status)`: Updates order status; if `SHIPPED` or `CANCELLED`, sends relevant email; if cancelled, restores inventory.  
- `cancelOrder(Long id, Long userId)`: Allows user to cancel pending order; restores inventory; creates cancellation record.  
- `getOrderDetailByUserId`, `getOrderDetailHistory` – user order history with filters.  
- `initiateBakongPayment(Long orderId)`: Generates QR for existing pending KHQR order.  
- `verifyBakongPayment(Long orderId, String md5)`: Verifies transaction with Bakong via MD5; updates order to CONFIRMED; records payment transaction.  
- `processBakongPaymentCallback(String orderNumber, String transactionId, String status)`: Process asynchronous callback from Bakong; updates order and payment status; records transaction.  
- `getOrderStatusSummary()`, `getOrderItemsByOrderId`.

**Notable**:  
- Supports multi-currency (USD/KHR) with exchange rate conversion for Bakong.  
- Generates QR and deep link for KHQR payments.  
- Integration with `PaymentTransactionService` to record all payment outcomes.  
- Uses `EmailNotificationService` for order-related emails.

---

## 14. PaymentServiceImpl

**Purpose**: Manages payment records and processing.  

**Key Dependencies**:  
- `PaymentRepository`, `OrderRepository`, `PaymentTransactionService`  

**Main Methods**:  
- `getPayments(GetPaymentRequest)`: Paginated search with filters (user, order, status, payment method).  
- `processPayment(Long orderId, PaymentRequest)`: Creates a payment record, updates order status to PROCESSING, and records a successful `PaymentTransaction`.  
- `getPaymentById`, `getPaymentsByUser`, `getPaymentDetailByUser`, `getPaymentByOrder`, `getPaymentByTransaction`.  
- `updatePaymentStatus(Long paymentId, String status, String transactionId)`: Updates payment status and optionally transaction ID.  
- `getPaymentHistory` – user payment history.

**Notable**:  
- `processPayment` also records a `PaymentTransaction` via `PaymentTransactionService` to ensure every settled payment has a transaction entry (useful for refunds).  
- Transaction ID generation uses a simple timestamp+random.

---

## 15. PaymentTransactionServiceImpl

**Purpose**: Manages payment transaction records and status history.  

**Key Dependencies**:  
- `PaymentTransactionRepository`, `PaymentTransactionStatusHistoryRepository`  

**Main Methods**:  
- `getTransactions(GetPaymentTransactionRequest)`: Paginated search (by order, customer, status).  
- `getTransactionById`, `getTransactionByNo`, `getTransactionsByOrder`, `getTransactionsByCustomer`.  
- `getTransactionStatusHistory(Long transactionId)`: Returns status change history.  
- `createTransaction(PaymentTransactionRequest)`: Creates a new transaction with status PENDING; records initial history.  
- `updateTransactionStatus(Long transactionId, PaymentTransactionStatusUpdateRequest)**: Updates status and records change history.  
- `recordTransaction(PaymentTransactionRequest, TransactionStatus, String changedBy, String reason)**: Convenience method to create and optionally finalise a transaction.

**Notable**:  
- Generates a unique `transactionNo` (prefix "PAY-" + random alphanumeric).  
- Status history is stored in a separate table for audit.

---

## 16. ProductAttributeServiceImpl

**Purpose**: Manages product attributes (e.g., color, size) for a product SKU.  

**Key Dependencies**:  
- `ProductAttributeRepository`, `ProductAttributeValueServiceImpl`, `ProductSkuRepository`  

**Main Methods**:  
- `createAttribute(Long productSkuId, ProductAttributeRequest)`: Creates an attribute and its associated values.  
- `getAttributeById`, `getAttributeByName`, `getAllAttributes`.  
- `updateAttribute(Long id, ProductAttributeRequest)`: Updates attribute name; also handles creation/update of attribute values.  
- `deleteAttribute(Long id)`: Hard delete.

**Notable**: Each attribute belongs to a `ProductSku`. Attribute values are created/updated via nested requests.

---

## 17. ProductAttributeValueServiceImpl

**Purpose**: Manages values for product attributes.  

**Key Dependencies**:  
- `ProductAttributeValueRepository`, `ProductAttributeRepository`  

**Main Methods**:  
- `createAttributeValue(Long attributeId, ProductAttributeValueRequest)`: Creates a new value for an attribute.  
- `getAttributeValueById`, `getValuesByAttributeId`.  
- `updateAttributeValue(Long id, ProductAttributeValueRequest)`: Updates value; checks duplicate within attribute.  
- `deleteAttributeValue(Long id)`: Hard delete.  
- `getAttributeValueByAttributeAndValue(Long attributeId, String value)`: Retrieves by combination.

---

## 18. ProductServiceImpl

**Purpose**: Core product management, including creation, update, search, and retrieval with SKUs.  

**Key Dependencies**:  
- `ProductRepository`, `SubCategoryRepository`, `ImageService`, `ProductSkuService`  

**Main Methods**:  
- `createProduct(ProductRequest, List<MultipartFile> files, List<MultipartFile> skuImages)`: Creates product with images; also creates associated SKUs.  
- `getProducts(GetProductRequest)`: Paginated search with filters (by name, subCategory, category, active, etc.); supports single product retrieval by ID.  
- `getProductById`, `getProductWithSkus`, `getAllProducts`, `getActiveProducts`.  
- `getProductsBySubCategory`, `getProductsByCategory`, `searchProducts`.  
- `updateProduct(Long id, ProductRequest, files, skuImages)`: Updates product details; can update images and SKUs (create/update).  
- `deleteProduct(Long id)`: Soft-delete.  
- `updateProductStatus(Long id, Boolean isActive)`: Toggles active flag.

**Notable**:  
- Images are uploaded via `ImageService` and associated with the product.  
- SKU creation/update is delegated to `ProductSkuService`.  
- Multiple filter types supported in `getProducts`.

---

## 19. ProductSkuServiceImpl

**Purpose**: Manages product SKUs (stock keeping units) including attributes, inventory, and SKU code generation.  

**Key Dependencies**:  
- `ProductSkuRepository`, `ProductRepository`, `ProductAttributeServiceImpl`, `InventoryServiceImpl`, `SkuGeneratorUtil`, `ImageService`  

**Main Methods**:  
- `createSku(Long productId, ProductSkuRequest, MultipartFile image)`: Creates SKU with optional image; if `operatorProductAttribute` is true, creates attributes and inventory.  
- `updateSku(Long skuId, ProductSkuRequest, MultipartFile image)`: Updates SKU; can update/delete attributes and inventory.  
- `deleteSku(Long skuId)`: Hard delete.  
- `getSkuById`, `getSkusByProductId`.

**Notable**:  
- SKU code is generated via `SkuGeneratorUtil` using product name and attribute values (e.g., "IPH15-BLU-128").  
- Inventory is created/updated automatically when SKU is created/updated.

---

## 20. RefundServiceImpl

**Purpose**: Handles refund requests, processing, and status tracking.  

**Key Dependencies**:  
- `RefundRepository`, `RefundStatusHistoryRepository`, `PaymentTransactionRepository`, `OrderItemRepository`, `ProductService`  

**Main Methods**:  
- `getRefundSummary()`: Returns aggregate stats (total, completed, pending, amount).  
- `getRefundList(GetRefundListRequest)`: Paginated search (by refund ID, order number, customer name, status, date range).  
- `getRefundDetail(String refundId)`: Full detail.  
- `getRefundHistory(String refundId)`: Status change history.  
- `getSimilarProducts(String refundId, Integer page, Integer size)`: Suggests similar products based on subCategory of the refunded order item.  
- `processRefund(String refundId, ProcessRefundRequest)`: Changes status from PENDING to PROCESSED; records history; syncs payment transaction status if fully refunded.  
- `cancelRefund(String refundId, CancelRefundRequest)`: Cancels a pending refund.  
- `createRefundFromReturn(Return returnRequest)`: Called when a return is completed; creates a refund request (amount must not exceed remaining balance of the payment transaction).

**Notable**:  
- Ensures refund amount does not exceed the remaining amount of the original payment transaction.  
- When a refund is processed, if the total processed amount equals the payment transaction amount, the transaction status is updated to `REFUNDED`.  
- Generates unique `refundId` (e.g., "RFD-XXXX").

---

## 21. ReturnServiceImpl

**Purpose**: Manages product returns (including refunds and exchanges).  

**Key Dependencies**:  
- `ReturnRequestRepository`, `OrderRepository`, `RefundService`, `InventoryRepository`  

**Main Methods**:  
- `createReturn(CreateReturnRequest)`: Creates a new return request with status REQUESTED.  
- `getReturnSummary()`: Returns stats with return rate.  
- `getReturnDetail(String returnId)`, `getReturnHistory`.  
- `approveReturn(String returnId, ApproveReturnRequest)`: Approves a return; moves to APPROVED.  
- `rejectReturn(String returnId, RejectReturnRequest)`: Rejects.  
- `receiveReturn(String returnId, ReceiveReturnRequest)`: Marks as RECEIVED (product physically returned).  
- `startInspection(String returnId)`: Moves to INSPECTING.  
- `completeInspection(String returnId, CompleteInspectionRequest)`: If passed, moves to COMPLETED; then increases inventory (restocks product) and (if not exchange) creates a refund via `RefundService`.  
- `getReturns(GetReturnRequest)`: Paginated search (by return ID, order number, customer name, product name, status, return type).

**Notable**:  
- Return workflow: REQUESTED → APPROVED → RECEIVED → INSPECTING → COMPLETED (or REJECTED at various stages).  
- On successful completion, inventory is restocked (default SKU of the product).  
- Refund creation is delegated to `RefundService`.

---

## 22. SubCategoryServiceImpl

**Purpose**: Manages sub-categories (product sub-categories linked to a parent category).  

**Key Dependencies**:  
- `SubCategoryRepository`, `CategoryRepository`, `ImageService`  

**Main Methods**:  
- `createSubCategory(SubCategoryRequest, MultipartFile)`: Creates sub-category with image; checks uniqueness within category.  
- `getSubCategories(GetSubCategoryRequest)`: Paginated search (by name, category ID); also supports single retrieval by ID with/without products.  
- `getSubCategoryById`, `getSubCategoryAll`, `getSubCategoriesByCategoryAsList`.  
- `updateSubCategory(Long id, SubCategoryRequest, MultipartFile)`: Updates fields; if file provided, updates image.  
- `deleteSubCategory(Long id)`: Hard delete.  
- `getSubCategoryWithProducts(Long id)`: Retrieves sub-category with its products.

**Notable**:  
- Image is stored as an `Image` entity via `ImageService`.  
- Check for duplicate sub-category names within the same category.

---

## 23. UserGroupServiceImpl

**Purpose**: Manages assignments of users to groups (permission groups).  

**Key Dependencies**:  
- `UserGroupRepository`  

**Main Methods**:  
- `getUserGroups(GetUserGroupRequest)`: Paginated search (by groupId, userId, active status).  
- `getUserGroupById(Long groupId)`.  
- `createUserGroup(...)`: Not supported directly (assigning a user to a group requires a userId and groupId, but method signature differs – may be for future).  
- `updateUserGroup(Long groupId, String groupName, String display, Boolean isActive)`: Updates active status (other fields are placeholders).  
- `deleteUserGroup(Long groupId)`: Soft-delete.

**Notable**: The repository is `UserGroupRepository`; `isDelete` field used for soft deletion.

---

## 24. UserPermissionServiceImpl

**Purpose**: Manages direct user permissions (many-to-many between `User` and `FunctionPermission`).  

**Key Dependencies**:  
- `UserPermissionRepository`  

**Main Methods**:  
- `getUserPermissions(GetUserPermissionRequest)`: Paginated search (by userId, funcId, both, active status).  
- `getUserPermissionById`.  
- `createUserPermission(Long userId, Long funcId)`: Creates a direct permission for a user; checks uniqueness.  
- `updateUserPermission(Long userPermissionId, Boolean isActive)`: Toggles active flag.  
- `deleteUserPermission(Long userPermissionId)`: Hard delete.

**Notable**: `UserPermission` links `userId` and `funcId`; `isActive` controls whether the permission is currently enabled.

---

## 25. UserServiceImpl

**Purpose**: User management – CRUD, profile picture, password change, status update, etc.  

**Key Dependencies**:  
- `UserRepository`, `RoleRepository`, `GroupRepository`, `UserGroupRepository`, `FunctionPermissionRepository`, `UserPermissionRepository`, `ImageService`, `PasswordEncoder`  

**Main Methods**:  
- `createUser(AdminCreateUserRequest)`: Admin-only user creation with roles, groups, and direct permissions assigned.  
- `getUserById`, `getAllUsers`, `searchUsers`.  
- `updateUser(Long id, UserRequest)`: Updates user details (password, fullName, email, birthdate).  
- `deleteUser(Long id)`: Soft-delete (sets `deleted=true`).  
- `changeUserStatus(Long id, String status)`: Changes user status (ACT/BLK etc.).  
- `updateProfilePicture(Long userId, MultipartFile)`: Uploads new profile picture via `ImageService`.  
- `countUsers`: Returns total count.  
- `changeUserPassword(Long userId, String oldPassword, String newPassword)`: Verifies old password before updating.

**Notable**:  
- Admin creation includes assigning groups and permissions; checks existence and non-deleted status.  
- Uses `PasswordEncoder` for encoding.

---

## Cross-Cutting Concerns

- **Response Wrapper**: All service methods return `ResponseErrorTemplate` (or specific DTOs) – a standard structure containing a message, code, and payload.  
- **Exception Handling**: Custom exceptions (e.g., `ResourceNotFoundException`) are thrown and caught by a global `@ControllerAdvice`, returning appropriate HTTP statuses.  
- **Logging**: Extensive use of `@Slf4j` for auditing and debugging.  
- **Security**: Many methods retrieve the current user from `SecurityContextHolder` for audit fields (e.g., `performedBy`, `changedBy`).  
- **Email**: Asynchronous email sending via `@Async` (in `EmailService`) or synchronous (in `EmailNotificationService`).  
- **Payment Integration**: `OrderServiceImpl` integrates with `BakongService` for KHQR payment generation and verification.  
- **Inventory**: All inventory changes are logged via `StockMovement`.  

---

## Summary

The service layer is well-organised with clear separation of concerns. Each service focuses on a specific domain entity or business process. The use of repositories, mappers, and DTOs keeps the code maintainable. The integration with external services (email, Bakong) is encapsulated within the respective services. Transactions are managed appropriately, ensuring data consistency across related operations.
