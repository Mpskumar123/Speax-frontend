const express = require('express');
const mongoose = require('mongoose');
const { ApolloServer, gql } = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const User = require('./models/user');

const app = express();
const port = 5000;

const url = 'mongodb+srv://pavansaikumar49:5QZ4q7em24FZgHAW@cluster0.xkg6axr.mongodb.net/speakx';
mongoose.connect(url)
  .then(() => { console.log("connected to SpeakX"); })
  .catch((err) => { console.error("Error connecting to MongoDB:", err.message); });

const typeDefs = gql`
  type Query {
    user: User
    allUsers: [User!]!
  }

  type User {
    id: ID!
    username: String!
    email: String!
    password: String!
  }

  type Payload {
    token: String!
    user: User
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): User
    login(email: String!, password: String!): Payload
  }
`;

const resolvers = {
  Query: {
    user: async (parent, args, context) => {
      const token = context.req.headers.authorization;
      if (!token) {
        throw new Error('Authentication required');
      }
      const decoded = jwt.verify(token, 'secret');
      const user = await User.findById(decoded.id);
      return user;
    },
    allUsers: async () => {
      return await User.find();
    },
  },
  Mutation: {
    register: async (parent, args) => {
      const user = new User(args);
      await user.save();
      return user;
    },
    login: async (parent, args) => {
      const user = await User.findOne({ email: args.email });
      if (!user) {
        throw new Error('No user with that email');
      }
      const valid = await user.isCorrectPassword(args.password);
      if (!valid) {
        throw new Error('Incorrect password');
      }
      const token = jwt.sign({ id: user.id }, 'secret', { expiresIn:"1m"});
      return { token, user };
    },
  },
};

const startServer = async () => {
  const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    context: ({ req }) => ({ req }) 
  });
  await server.start();
  server.applyMiddleware({ app });
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}${server.graphqlPath}`);
  });
};

startServer();
