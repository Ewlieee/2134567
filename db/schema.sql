-- Схема базы данных «Книжная полка» (Microsoft SQL Server)
-- Скрипт выполняется командой `npm run db:init` (разделитель пакетов — GO).

IF OBJECT_ID('dbo.News', 'U') IS NOT NULL DROP TABLE dbo.News;
IF OBJECT_ID('dbo.BookRequests', 'U') IS NOT NULL DROP TABLE dbo.BookRequests;
IF OBJECT_ID('dbo.Reviews', 'U') IS NOT NULL DROP TABLE dbo.Reviews;
IF OBJECT_ID('dbo.Shelf', 'U') IS NOT NULL DROP TABLE dbo.Shelf;
IF OBJECT_ID('dbo.Books', 'U') IS NOT NULL DROP TABLE dbo.Books;
IF OBJECT_ID('dbo.Genres', 'U') IS NOT NULL DROP TABLE dbo.Genres;
IF OBJECT_ID('dbo.Authors', 'U') IS NOT NULL DROP TABLE dbo.Authors;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

CREATE TABLE dbo.Users (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Username     NVARCHAR(50)  NOT NULL,
    Email        NVARCHAR(255) NOT NULL,
    PasswordHash NVARCHAR(100) NOT NULL,          -- bcrypt-хеш, пароль в открытом виде не хранится
    DisplayName  NVARCHAR(100) NULL,
    Bio          NVARCHAR(1000) NULL,
    Role         NVARCHAR(20)  NOT NULL CONSTRAINT DF_Users_Role DEFAULT N'user',
    IsBlocked    BIT           NOT NULL CONSTRAINT DF_Users_IsBlocked DEFAULT 0,
    CreatedAt    DATETIME2     NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_Username UNIQUE (Username),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_Role CHECK (Role IN (N'user', N'admin'))
);
GO

CREATE TABLE dbo.Authors (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    Name      NVARCHAR(200)  NOT NULL,
    BirthYear INT            NULL,
    DeathYear INT            NULL,
    Country   NVARCHAR(100)  NULL,
    Bio       NVARCHAR(MAX)  NULL,
    CreatedAt DATETIME2      NOT NULL CONSTRAINT DF_Authors_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Authors_Name UNIQUE (Name)
);
GO

CREATE TABLE dbo.Genres (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(100) NOT NULL,
    Description NVARCHAR(1000) NULL,
    CONSTRAINT UQ_Genres_Name UNIQUE (Name)
);
GO

-- Одна книга принадлежит одному автору и одному жанру
CREATE TABLE dbo.Books (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    Title      NVARCHAR(300) NOT NULL,
    AuthorId   INT           NOT NULL CONSTRAINT FK_Books_Authors REFERENCES dbo.Authors(Id),
    GenreId    INT           NOT NULL CONSTRAINT FK_Books_Genres REFERENCES dbo.Genres(Id),
    Year       INT           NULL,
    ISBN       NVARCHAR(20)  NULL,
    Publisher  NVARCHAR(200) NULL,
    Language   NVARCHAR(50)  NULL,
    Pages      INT           NULL,
    Annotation NVARCHAR(MAX) NULL,
    CoverUrl   NVARCHAR(500) NULL,
    IsArchived BIT           NOT NULL CONSTRAINT DF_Books_IsArchived DEFAULT 0,
    CreatedAt  DATETIME2     NOT NULL CONSTRAINT DF_Books_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Books_Pages CHECK (Pages IS NULL OR Pages > 0)
);
CREATE INDEX IX_Books_AuthorId ON dbo.Books(AuthorId);
CREATE INDEX IX_Books_GenreId ON dbo.Books(GenreId);
CREATE INDEX IX_Books_CreatedAt ON dbo.Books(CreatedAt);
GO

-- Личная полка: статус и прогресс чтения
CREATE TABLE dbo.Shelf (
    UserId      INT          NOT NULL CONSTRAINT FK_Shelf_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    BookId      INT          NOT NULL CONSTRAINT FK_Shelf_Books REFERENCES dbo.Books(Id) ON DELETE CASCADE,
    Status      NVARCHAR(20) NOT NULL,
    CurrentPage INT          NOT NULL CONSTRAINT DF_Shelf_CurrentPage DEFAULT 0,
    AddedAt     DATETIME2    NOT NULL CONSTRAINT DF_Shelf_AddedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2    NOT NULL CONSTRAINT DF_Shelf_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Shelf PRIMARY KEY (UserId, BookId),
    CONSTRAINT CK_Shelf_Status CHECK (Status IN (N'want', N'reading', N'read')),
    CONSTRAINT CK_Shelf_CurrentPage CHECK (CurrentPage >= 0)
);
GO

-- Один пользователь — один отзыв на книгу
CREATE TABLE dbo.Reviews (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT           NOT NULL CONSTRAINT FK_Reviews_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    BookId    INT           NOT NULL CONSTRAINT FK_Reviews_Books REFERENCES dbo.Books(Id) ON DELETE CASCADE,
    Rating    TINYINT       NOT NULL,
    Text      NVARCHAR(4000) NULL,
    CreatedAt DATETIME2     NOT NULL CONSTRAINT DF_Reviews_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2     NULL,
    CONSTRAINT UQ_Reviews_User_Book UNIQUE (UserId, BookId),
    CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5)
);
CREATE INDEX IX_Reviews_BookId ON dbo.Reviews(BookId);
GO

-- Заявки пользователей на добавление книг
CREATE TABLE dbo.BookRequests (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    UserId       INT           NOT NULL CONSTRAINT FK_BookRequests_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    Title        NVARCHAR(300) NOT NULL,
    AuthorName   NVARCHAR(200) NOT NULL,
    Comment      NVARCHAR(2000) NULL,
    Status       NVARCHAR(20)  NOT NULL CONSTRAINT DF_BookRequests_Status DEFAULT N'pending',
    AdminComment NVARCHAR(2000) NULL,
    BookId       INT           NULL CONSTRAINT FK_BookRequests_Books REFERENCES dbo.Books(Id) ON DELETE SET NULL,
    CreatedAt    DATETIME2     NOT NULL CONSTRAINT DF_BookRequests_CreatedAt DEFAULT SYSUTCDATETIME(),
    ReviewedAt   DATETIME2     NULL,
    CONSTRAINT CK_BookRequests_Status CHECK (Status IN (N'pending', N'approved', N'rejected'))
);
GO

CREATE TABLE dbo.News (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    Title     NVARCHAR(300) NOT NULL,
    Body      NVARCHAR(MAX) NOT NULL,
    AuthorId  INT           NULL CONSTRAINT FK_News_Users REFERENCES dbo.Users(Id) ON DELETE SET NULL,
    CreatedAt DATETIME2     NOT NULL CONSTRAINT DF_News_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO
