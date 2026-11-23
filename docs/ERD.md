# ERD – MazdaClub Nederland

Het entity-relationship-diagram hieronder is in [Mermaid](https://mermaid.js.org/) geschreven en wordt automatisch
als diagram getoond op GitHub, GitLab en in VS Code (met de extensie *Markdown Preview Mermaid Support*).
De bron van waarheid is altijd [`prisma/schema.prisma`](../prisma/schema.prisma).

```mermaid
erDiagram
    User ||--o| Membership : "heeft"
    User ||--o{ Order : "plaatst"
    User ||--o{ EventRegistration : "schrijft in"
    User ||--o{ Payment : "betaalt"
    User ||--o{ PasswordResetToken : "vraagt aan"

    Membership ||--o{ Payment : "jaarlijkse betaling"

    Event ||--o{ EventRegistration : "heeft deelnemers"
    Event ||--o{ Album : "fotoalbum"
    EventRegistration ||--o{ Payment : "deelnamekosten"

    ProductCategory ||--o{ Product : "bevat"
    Product ||--|{ ProductVariant : "varianten"
    Product ||--o{ OrderItem : "verkocht als"
    ProductVariant ||--o{ OrderItem : "verkocht als"
    Order ||--|{ OrderItem : "bevat"
    Order ||--o{ Payment : "betaling"

    Album ||--o{ Photo : "bevat"

    User {
        string id PK
        string email UK
        string passwordHash "bcrypt, cost 12"
        string firstName
        string lastName
        string phone
        string street
        string houseNumber
        string postalCode
        string city
        string country "NL of BE"
        string licensePlate
        string carModel
        enum role "USER of ADMIN"
        boolean marketingConsent
        string mollieCustomerId UK
        datetime lastLoginAt
        datetime createdAt
    }

    Membership {
        string id PK
        string userId FK,UK
        int memberNumber UK "MCN-00001"
        enum status "PENDING ACTIVE EXPIRED CANCELLED"
        datetime startedAt
        datetime currentPeriodStart
        datetime currentPeriodEnd
        boolean autoRenew
        string mollieSubscriptionId UK
        datetime reminderSentAt
    }

    PasswordResetToken {
        string id PK
        string userId FK
        string tokenHash UK "sha256"
        datetime expiresAt
        datetime usedAt
    }

    Event {
        string id PK
        string slug UK
        string title
        string summary
        text description
        datetime startsAt
        datetime endsAt
        datetime registrationDeadline
        string locationName
        string address
        string city
        int capacity
        int priceNonMember "centen, standaard 500"
        int priceMember "centen, standaard 0"
        string imageUrl
        enum status "DRAFT PUBLISHED CANCELLED"
    }

    EventRegistration {
        string id PK
        string eventId FK
        string userId FK "optioneel"
        string firstName
        string lastName
        string email
        string phone
        string licensePlate
        text remarks
        boolean isMember
        int amount "centen"
        enum status "PENDING CONFIRMED CANCELLED"
        datetime confirmationSentAt
    }

    ProductCategory {
        string id PK
        string slug UK
        string name
        int sortOrder
    }

    Product {
        string id PK
        string slug UK
        string name
        text description
        string categoryId FK
        int basePrice "centen incl. btw"
        string_array images
        boolean active
        boolean featured
    }

    ProductVariant {
        string id PK
        string productId FK
        string name
        string sku UK
        int price "optioneel, centen"
        int stock
        json attributes "maat, kleur"
        boolean active
    }

    Order {
        string id PK
        string orderNumber UK
        string userId FK "optioneel (gastbestelling)"
        string email
        string firstName
        string lastName
        enum shippingMethod "POSTNL_NL POSTNL_BE PICKUP_EVENT"
        enum status "PENDING PAID PROCESSING SHIPPED COMPLETED CANCELLED REFUNDED"
        int subtotal
        int discount "25% ledenkorting"
        int shippingCost
        int total
        boolean memberDiscountApplied
        string trackingCode
        datetime paidAt
        datetime shippedAt
    }

    OrderItem {
        string id PK
        string orderId FK
        string productId FK
        string variantId FK
        string productName "snapshot"
        string variantName "snapshot"
        string sku
        int unitPrice
        int quantity
        int lineTotal
    }

    Payment {
        string id PK
        enum provider "MOLLIE STRIPE MOCK"
        string providerPaymentId UK "tr_... / cs_..."
        enum type "ORDER EVENT MEMBERSHIP"
        enum status "OPEN PENDING PAID FAILED CANCELED EXPIRED REFUNDED"
        int amount
        string method "ideal, bancontact, creditcard, applepay, ..."
        string userId FK
        string orderId FK
        string registrationId FK
        string membershipId FK
        boolean isRecurring
        datetime paidAt
    }

    Album {
        string id PK
        string slug UK
        string title
        text description
        datetime date
        string eventId FK "optioneel"
        string coverUrl
        boolean published
    }

    Photo {
        string id PK
        string albumId FK
        string url "WebP, max 2400px"
        string thumbUrl "WebP, 640px"
        string storageKey
        int width
        int height
        int sizeBytes
        string caption
        int sortOrder
    }

    SiteContent {
        string key PK
        text value
    }

    AppSetting {
        string key PK
        json value
        string updatedBy
    }

    AdminNotification {
        string id PK
        string type
        string title
        text message
        string link
        datetime readAt
    }

    NewsPost {
        string id PK
        string slug UK
        string title
        string excerpt
        text content
        string coverUrl
        boolean published
        datetime publishedAt
        string authorName
    }

    ContactMessage {
        string id PK
        string name
        string email
        string subject
        text message
        boolean handled
    }

    PartnerOffer {
        string id PK
        string partnerName
        string title
        text description
        string discountCode
        boolean membersOnly
        datetime validUntil
        boolean active
    }
```

## Leeswijzer

| Symbool | Betekenis |
| --- | --- |
| `\|\|--o\|` | één-op-nul-of-één (een gebruiker heeft hooguit één lidmaatschap) |
| `\|\|--o{` | één-op-nul-of-meer |
| `\|\|--\|{` | één-op-één-of-meer (een product heeft altijd minstens één variant) |

`SiteContent`, `AppSetting`, `AdminNotification`, `NewsPost`, `ContactMessage` en `PartnerOffer` staan los: ze hebben geen relaties met andere tabellen. `EmailVerificationToken` hoort bij `User` (zoals `PasswordResetToken`); `User` heeft daarnaast `emailVerifiedAt`.
