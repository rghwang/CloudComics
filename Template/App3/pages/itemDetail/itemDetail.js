(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/itemDetail/itemDetail.html", {
        // 이 함수는 사용자가 이 페이지로 이동할 때마다 호출되어
        // 페이지 요소를 응용 프로그램 데이터로 채웁니다.
        ready: function (element, options) {
            var item = options && options.item ? Data.resolveItemReference(options.item) : Data.items.getAt(0);
            //element.querySelector(".titlearea .pagetitle").textContent = item.group.title;
            //element.querySelector("article .item-image").src = item.backgroundImage;
            //element.querySelector("article .item-image").alt = item.subtitle;
            //element.querySelector(".content").focus();

            var flipView = element.querySelector("#imageFlipView").winControl;
            var items = Data.getItemsFromGroup(Data.resolveGroupReference("files"));

            flipView.itemDataSource = items.dataSource;
            flipView.itemTemplate = itemTemplate;
            flipView.currentPage = items.indexOf(item);
            
            document.getElementById("cmd").addEventListener("click", function () {
                WinJS.Navigation.back();
            });
        }
    });
})();
