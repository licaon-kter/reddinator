// set article from document hash
var articleId = document.location.hash.substring(1);
var username;
var subAuthor;
var isArchived = false;
var color_vote = "#A5A5A5";
var color_upvote_active = "#FF8B60";
var color_downvote_active = "#9494FF";
var baseId = "t3_";

function init(themeColors, user){
    username = user;
    setTheme(themeColors);
}

function populateComments(author, archived, json){
    subAuthor = author;
    isArchived = archived;
    var data = JSON.parse(json);
    $("#loading_view").hide();
    $("#base").show();
    if (data.length > 0)
        baseId = data[0].data.parent_id;
    recursivePopulate(data);
}

function recursivePopulate(data){
    for (var i in data){
        if (data[i].kind!="more"){
            appendComment(data[i].data.parent_id, data[i].data, false);
            if (data[i].data.replies!="" && data[i].data.replies.data.children!=null)
                recursivePopulate(data[i].data.replies.data.children);
        } else {
            appendMoreButton(data[i].data.parent_id, data[i].data);
        }
    }
}

function clearComments(){
    $("#base").html();
}

function showLoadingView(text){
    var loading = $("#loading_view");
    loading.children("h4").text(text);
    $("#base").hide();
    loading.show();
}
// java bind functions
function reloadComments(){
    showLoadingView("Loading...");
    $("#base").html('');
    Reddinator.reloadComments($("#sort_select").val());
}

function reloadCommentsContext(){
    showLoadingView("Loading...");
    $("#base").html('');
    Reddinator.reloadComments($("#context_sort_select").val(), parseInt($("#context_select").val()));
}

function loadChildComments(moreId, children){
    Reddinator.loadChildren(moreId, children);
}

function commentCallback(parentId, commentData){
    //console.log("comment callback called");
    var postElem;
    if (parentId.indexOf("t3_")!==-1){
        postElem = $("#post_comment_box");
    } else {
        postElem = $("#"+parentId+" > .post_box");
    }
    if (commentData){
        commentData = JSON.parse(commentData);
        postElem.children("textarea").val("");
        if (parentId.indexOf("t3_")!==-1){
            $("#post_comment_button").show();
            // in case of submitting first comment
            $("#loading_view").hide();
            $("#base").show();
        }
        postElem.children('textarea').val('');
        postElem.hide();
        appendComment(parentId, commentData, true);
        $("#loading_view").hide();
    }
    postElem.children("button").prop("disabled", false);
}

function populateChildComments(moreId, json){
    //console.log(json)
    var data = JSON.parse(json);
    //console.log(json);
    var more = $("#"+moreId);
    var currentLength = more.data('rlength');
    var currentChildren = more.data('rchildren'); // child comments are only fetched 20 at a time, so we need to keep track of the current ids
    if (currentChildren!=null){
        currentChildren = currentChildren.split(",");
        if (currentChildren && currentChildren.length > 800){
            currentChildren = currentChildren.splice(800);
        } else {
            currentChildren = [];
        }
    } else {
        currentChildren = [];
    }
    more.remove();

    for (var i in data){
        if (data[i].kind!="more"){
            appendComment(data[i].data.parent_id, data[i].data, false);
        } else {
            // append newly returned child ids to the current ones (if any)
            if (data[i].data.parent_id.indexOf("t3_")!==-1){
                //console.log(JSON.stringify(data[i]));
                data[i].data.children = arrayUnique(data[i].data.children.concat(currentChildren));
                data[i].data.count = currentLength - data.length;
            }
            appendMoreButton(data[i].data.parent_id, data[i].data);
        }
    }
}

function arrayUnique(array) {
    var a = array.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}

function noChildrenCallback(moreId){
    $("#"+moreId+" h5").text("There's nothing more here");
}

function resetMoreClickEvent(moreId){
    var moreElem = $("#"+moreId);
    moreElem.children("h5").text('Load '+moreElem.data('rlength')+' More');
    moreElem.one('click',
        //{id: moreElem.data('rname'), children: moreElem.data('rchildren')},
        {id: moreElem.data('rname'), children: moreElem.data('rchildren').split(",").slice(0,801).join(",")},
        function(event){
            $(this).children("h5").text("Loading...");
            loadChildComments(event.data.id, event.data.children);
        }
    );
}

function appendMoreButton(parentId, moreData){
    var moreElem = $("#more_template").clone().show();
    moreElem.attr("id", moreData.name);
    // If the comment count is 0, it indicates a "continue this thread" more object
    // We need to open in comments context dialog as api/morechildren call will return nothing.
    var buttonText = moreData.count==0 ? 'Continue this thread' : 'Load '+moreData.count+' More';
    moreElem.children("h5").text(buttonText);
    moreElem.data('rlength', moreData.count)
    moreElem.data('rname', moreData.name);
    moreElem.data('rchildren', moreData.children.join(","));
    if (moreData.count > 0){
        moreElem.one('click',
            //{id: moreData.name, children: moreData.children.join(",")},
            {id: moreData.name, children: moreData.children.slice(0,801).join(",")},
            function(event){
                $(this).children("h5").text("Loading...");
                loadChildComments(event.data.id, event.data.children);
            }
        );
    } else {
        moreElem.on('click',
            {parent_id: moreData.parent_id.split("_")[1]},
            function(event){
                Reddinator.openCommentsContext(event.data.parent_id);
            }
        );
    }
    if (parentId.indexOf("t3_")!==-1){
        moreElem.css("margin-right", "0").appendTo("#base");
    } else {
        moreElem.appendTo("#"+parentId+"-replies");
        var repliesElem = $("#"+parentId).children(".comment_info").children(".comment_reply_count");
        repliesElem.text(parseInt(repliesElem.text())+moreData.count);
    }
}

function appendComment(parentId, commentData, prepend){
    //console.log(JSON.stringify(commentData));
    var commentElem = $("#comment_template").clone().show();
    commentElem.attr("id", commentData.name);
    commentElem.find(".comment_replies").attr("id", commentData.name+"-replies");
    commentElem.data("comment_md", commentData.body);
    commentElem.data("archived", commentData.archived);
    var text = htmlDecode(commentData.body_html.replace(/\n\n/g, "\n").replace("\n&lt;/div&gt;", "&lt;/div&gt;")); // clean up extra line breaks
    commentElem.find(".comment_text").html(text);
    commentElem.find(".comment_user").text('/u/'+commentData.author).attr('href', 'https://www.reddit.com/u/'+commentData.author);
    commentElem.find(".comment_score").text(commentData.score_hidden?'hidden':commentData.score);
    commentElem.find(".comment_reply_count").text("0");
    // check if likes
    if (commentData.hasOwnProperty('likes')){
        if (commentData.likes==true){
            commentElem.find(".upvote").css("color", color_upvote_active);
        } else if (commentData.likes==false) {
            commentElem.find(".downvote").css("color", color_downvote_active);
        }
        commentElem.data("likes", commentData.likes);
    } else {
        commentElem.data("likes", null);
    }
    // check if author
    if (commentData.author==username)
        commentElem.find(".user_option").show();
    var flag = commentElem.find(".distinguish_flag");
    if (commentData.author==subAuthor){
        flag.text("[S]");
        flag.show();
    }
    if (commentData.distinguished!=null){
        switch(commentData.distinguished){
            case "moderator":
                flag.text("[M]");
                flag.css("color", "#30925E");
                break;
            case "admin":
                flag.text("[A]");
                flag.css("color", "#F82330");
                break;
            case "special":
                flag.text("[Δ]");
                flag.css("color", "#C22344");
                break;
        }
        flag.show();
    }
    if (parentId.indexOf(baseId)!==-1){
        if (prepend){
            commentElem.prependTo("#base");
        } else {
            commentElem.appendTo("#base");
        }
    } else {
        if (prepend){
            commentElem.prependTo("#"+parentId+"-replies");
        } else {
            commentElem.appendTo("#"+parentId+"-replies");
        }
        var parent = $("#"+parentId);

        if (!parent.hasClass("even")){
            commentElem.addClass("even");
            commentElem.children('.option_container').children('.reply_expand').addClass("even");
        }

        parent.children('.option_container').children('.reply_expand').css('visibility', 'visible');
        var repliesElem = parent.children(".comment_info").children(".comment_reply_count");
        repliesElem.text(parseInt(repliesElem.text())+1);
    }
}

function toggleReplies(element){
    var replies = $(element).parent().parent().find(".comment_replies");
    if (replies.is(":visible")){
        replies.hide();
        $(element).children('h5').text("+");
        $(element).children('h6').text("show replies");
    } else {
        replies.show();
        $(element).children('h5').text("-");
        $(element).children('h6').text("hide replies");
    }
}

var postCommentMde;
function showPostCommentBox(){
    if (isArchived===true)
        return Reddinator.archiveToast();

    $("#post_comment_button").css('display', 'none');
    $('#post_comment_box').css('display', 'block');
    if (useMdEditor){
        postCommentMde = initialiseMarkdownEditor($("#post_comment_textarea"));
    } else {
        $('#post_comment_textarea').focus();
    }
}

function setContextLevel(level){
    $("#context_select").val(level);
}

$(function(){
    // Layout testing code, open reddinator/src/main/assets/comments.html#debug in a browser to view
    if (location.hash=="#debug"){
        useMdEditor = true;
        $("#loading_view").hide();
        $("body").show();
        $("#comment_template").clone().show().attr("id", 'test').appendTo("#base");
        $("#comment_template").clone().show().attr("id", 'test1').appendTo("#test > .comment_replies");
        $("#comment_template").clone().show().attr("id", 'test2').appendTo("#test > .comment_replies");
        $("#more_template").clone().show().attr("id", 'more2').appendTo("#test > .comment_replies");
        $("#test .reply_expand").css('visibility', 'visible');
        $("#test1 .reply_expand").css('visibility', 'visible');
        $("#comment_template").clone().show().attr("id", 'test3').appendTo("#test1 > .comment_replies");
        $("#comment_template").clone().show().attr("id", 'test4').appendTo("#test1 > .comment_replies");
        $(".user_option").show();
    }

    $(document).on('click', ".upvote", function(){
        vote($(this).parent().parent().attr("id"), 1);
    });
    $(document).on('click', ".downvote", function(){
        vote($(this).parent().parent().attr("id"), -1);
    });
    var cMdEditor = null;
    $(document).on('click', ".post_toggle", function(){
        if ($(this).parent().parent().parent().data("archived")===true)
                return Reddinator.archiveToast();

        var elem = $(this).parent().parent().parent().children(".post_reply");
        if (cMdEditor!=null){
            cMdEditor.toTextArea();
            cMdEditor = null;
        }
        if (elem.is(":visible")){
            elem.hide();
        } else {
            $('.post_reply').hide();
            elem.show();
            if (useMdEditor){
                cMdEditor = initialiseMarkdownEditor(elem.children("textarea"));
            } else {
                elem.children("textarea").focus();
            }
        }
    });
});