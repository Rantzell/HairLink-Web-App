<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HaircareArticle;
use App\Models\HaircareVideo;
use Illuminate\Http\Request;

class HaircareController extends Controller
{
    public function articles()
    {
        return response()->json(HaircareArticle::orderBy('created_at', 'desc')->get());
    }

    public function article($id)
    {
        return response()->json(HaircareArticle::findOrFail($id));
    }

    public function videos()
    {
        return response()->json(HaircareVideo::orderBy('created_at', 'desc')->get());
    }
}
