(function() {
  "use strict";

  angular.module('ps.widgets')
    .service('rssFeedService', rssFeedService);

  function rssFeedService($sce, $http, $q, dataService, historyService, bookmarkService) {
    var s = this;
    s.getFeeds = getFeeds;
    s.getFeed = getFeed;
    s.consolidateFeed = consolidateFeed;
    s.deleteItem = deleteItem;
    s.restoreDeletedItem = restoreDeletedItem;
    s.saveDeletedToSync = saveDeletedToSync;

    s.syncFolders = [];
    s.rssFeed = {
      numEntries: 50,
    };

    function getFeeds() {
      var feeds = [];
      s.deletedItems = [];
      if (angular.isDefined(dataService.data.rssFeed)) {
        if (angular.isDefined(dataService.data.rssFeed.feeds)) {
          feeds = angular.copy(dataService.data.rssFeed.feeds);
        }
        if (angular.isDefined(dataService.data.rssFeed.deletedItems)) {
          s.deletedItems = angular.copy(dataService.data.rssFeed.deletedItems);
        }

        s.rssFeed.hideVisited = dataService.data.rssFeed.hideVisited;
        s.rssFeed.allowDelete = dataService.data.rssFeed.allowDelete;
      }
      var promises = [];
      for (var p = 0; p < feeds.length; p++) {
        promises[p] = getFeed(feeds[p].url, s.rssFeed.numEntries);
      }
      return $q
        .all(promises)
        .then(function(data) {
          var k = 0;
          s.feed = [];
          for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].feed.entries.length; j++) {
              s.feed[k++] = data[i].feed.entries[j];
            }
          }
          return consolidateFeed()
            .then(function(feed) {
              return {
                feed: feed,
                allowDelete: s.rssFeed.allowDelete,
              };
            });
        });
    }

    function consolidateFeed() {
      var checkedVisits = [];
      var f;
      for (f = 0; f < s.feed.length; f++) {
        checkedVisits[f] = checkVisited(s.feed[f]);
      }
      return $q.all(checkedVisits)
        .then(function(feed) {
          var rss = [];
          var r = 0;
          s.deletedFeed = [];
          var d = 0;
          for (f = 0; f < feed.length; f++) {
            if ((!s.rssFeed.hideVisited || !feed[f].visited) && (!checkDuplicate(feed[f], rss)) && (!checkDeleted(feed[f]) || !s.rssFeed.allowDelete)) {
              rss[r++] = feed[f];
            } else if (checkDeleted(feed[f]) && s.rssFeed.allowDelete) {
              s.deletedFeed[d++] = feed[f];
            }
          }
          return rss
            .sort(function(a, b) {
              return b.timeStamp - a.timeStamp;
            })
            .slice(0, s.rssFeed.numEntries); //Limit to avoid Performance problems in DOM
        });
    }

    function checkVisited(entry) {
      return historyService.getVisits(entry.link)
        .then(function(visits) {
          if (visits.length > 0) {
            entry.visited = true;
          }
          return entry;
        });
    }

    function checkDuplicate(entry, feed) {
      var d = false;
      for (var f = 0; f < feed.length; f++) {
        if (entry.link === feed[f].link) {
          d = true;
        }
      }
      return d;
    }

    function deleteItem(item) {
      var rssFeed = dataService.data.rssFeed;

      s.deletedItems.push({
        link: item.link,
        dateStamp: new Date().toJSON(),
      });
      rssFeed.deletedItems = s.deletedItems;

      return dataService.setData({
        rssFeed: rssFeed,
      });
    }

    function restoreDeletedItem(item) {
      var rssFeed = dataService.data.rssFeed;
      s.deletedItems = rssFeed.deletedItems;
      for (var i = 0; i < s.deletedItems.length; i++) {
        if (item.link === s.deletedItems[i].link) {
          s.deletedItems.splice(i, 1);
          i--; //move back one step and continue  
        }
      }
      rssFeed.deletedItems = s.deletedItems;

      dataService.setData({
        rssFeed: rssFeed,
      });

    }

    function checkDeleted(entry) {
      var d = false;
      for (var f = 0; f < s.deletedItems.length; f++) {
        if (entry.link === s.deletedItems[f].link) {
          s.deletedItems[f].dateStamp = new Date().toJSON();
          d = true;
          break;
        }
      }
      return d;
    }

    function getFeed(url, num) {
      var queryUrl = 'http://ajax.googleapis.com/ajax/services/feed/load?v=1.0';
      queryUrl += '&num=' + num;
      queryUrl += '&q=' + encodeURIComponent(url);
      return $http.get(queryUrl)
        .then(function(data) {
          var result = {};
          if (data.data.responseStatus === 200) {
            result.feed = alignFeedData(data.data.responseData.feed);

          } else { // Error from googleapis
            result.message = data.data.responseDetails;
            result.feed = []; // Avoid crash if error
          }
          return result;
        })
        .catch(function() {
          return {
            message: 'Unable to connect to google api Service, check network. If this persists please report the issue to practical startpage.',
            feed: [],
          };
        });
    }

    function alignFeedData(feed) {
      var ico, icon;
      if (angular.isDefined(feed.link)) {
        ico = feed.link.split('/');
      } else {
        ico = feed.feedUrl.split('/');
      }
      icon = ico[0] + '//' + ico[2] + '/favicon.ico';
      angular.forEach(feed.entries, function(value) {
        value.icon = icon;
        value.timeStamp = new Date(value.publishedDate);
        if (angular.isDefined(value.contentSnippet)) {
          value.contentSnippet = $sce.trustAsHtml(value.contentSnippet);
        }
      });
      return feed;
    }

    function saveDeletedToSync() {
      return createSyncDateFolders()
        .then(function() {
          return bookmarkService.getSubTree(dataService.data.rssFeed.sync.delItemsFolder);
        })
        .then(function(delItemsFolders) {
          var promises = [];
          s.delItemsFolders = delItemsFolders;
          for (var d = 0; d < s.deletedItems.length; d++) {
            promises[d] = saveToSync(s.deletedItems[d]);
          }
          return $q.all(promises);
        });

    }

    function createSyncDateFolders() {
      var folders = [];
      var promises = [];
      var f = 0;
      for (var d = 0; d < s.deletedItems.length; d++) {
        var folder = new Date(s.deletedItems[d].dateStamp).toISOString().slice(0, 10);
        if (folders.indexOf(folder) === -1) {
          folders[f++] = folder;
        }
      }
      for (f = 0; f < folders.length; f++) {
        promises[f] = createSyncDateFolder(folders[f]);

      }
      return $q.all(promises);
    }

    function createSyncDateFolder(folder) {
      var search = {
        title: folder,
      };
      return bookmarkService.searchBookmarks(search)
        .then(function(result) {
          var exists = false;
          for (var r = 0; r < result.length; r++) {
            if (result[r].title === folder && result[r].parentId === dataService.data.rssFeed.sync.delItemsFolder) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            var newFolder = {
              title: folder,
              parentId: dataService.data.rssFeed.sync.delItemsFolder,
            };
            return bookmarkService.createBookmark(newFolder);
          } else {
            return 0;
          }
        });
    }

    function saveToSync(item) {
      var search = {
        url: item.link,
      };
      var findId = {
        property: 'title',
        value: new Date(item.dateStamp).toISOString().slice(0, 10),
      };
      var bkmrk = {
        parentId: s.delItemsFolders[0].children.find(findCB, findId).id,
        url: item.link,
      };
      return bookmarkService.searchBookmarks(search)
        .then(function(result) {
          var exist = false;
          for (var r = 0; r < result.length; r++) {
            var findId = {
              property: 'id',
              value: result[r].parentId,
            };
            if (result[r].url === bkmrk.url && s.delItemsFolders[0].children.findIndex(findCB, findId) > -1) {
              exist = true;
              break;
            }
          }
          if (!exist) {
            return bookmarkService.createBookmark(bkmrk);
          } else {
            return 0;
          }
        });
    }

    function findCB(element) {
      return element[this.property] === this.value;
    }

  }
})();
