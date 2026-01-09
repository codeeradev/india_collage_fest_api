
const mongoose = require('mongoose')

const eventSchema = new mongoose.Schema({
title:String,
description:String,
image:String,
location:{type:mongoose.Types.ObjectId, ref:'city'},
ticket_link:String,
user_id:{type:mongoose.Types.ObjectId, ref:'user'},
category:{type:mongoose.Types.ObjectId, ref:'category'},
sub_category:{type:mongoose.Types.ObjectId, ref:'sub_category'},
visibility:Boolean,
},{timestamps:true})

module.exports = mongoose.model('event',eventSchema)
