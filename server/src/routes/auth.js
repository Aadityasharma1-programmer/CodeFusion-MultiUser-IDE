const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const User = require('../models/User')

// User Sign-up/Registration
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body
  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] })
    if (userExists) {
      return res.status(400).json({ message: 'Username or email already in use' })
    }

    const newUser = new User({ username, email, password })
    await newUser.save()

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' })
    res.status(201).json({ token, user: { id: newUser._id, username, email } })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// User Sign-in/Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' })
    res.json({ token, user: { id: user._id, username: user.username, email } })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
