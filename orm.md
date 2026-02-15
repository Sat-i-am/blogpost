🧱 What is an ORM?

ORM = Object Relational Mapper

It is a tool that lets you interact with your database using code (objects) instead of writing raw SQL queries.

Instead of writing:

SELECT * FROM users WHERE email = 'abc@gmail.com';


You write:

prisma.user.findUnique({
  where: { email: "abc@gmail.com" }
})


Much cleaner. Much safer

🧠 Why Is It Called Object Relational?

Because:

Database → Tables (Relational model)

JavaScript → Objects

ORM maps:

Database	JavaScript
Table	Model
Row	Object
Column	Property
Relation	Nested Object

It connects the two worlds.




Prisma provides type-safe queries, prevents SQL injection, manages migrations, and improves developer productivity.

With Prisma Client

When you run:

npx prisma generate


Prisma reads your schema.prisma file and generates:

node_modules/@prisma/client


That folder contains:

Auto-generated database functions

Fully typed methods

Query builders

Now you can do:

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const post = await prisma.post.findUnique({
  where: { id: "123" }
})


This is the JS client.

It’s just a JavaScript interface that Prisma created for your database.