(function(angular) {
  'use strict';

  angular.module('PracticalStartpage.options', ['chromeModule'])
    .controller('OptionsCtrl', OptionsCtrl)
    .directive('psOptions', optionsDirective);


  function OptionsCtrl($timeout, storageService) {
    var vm = this;
    vm.tab = 1;
    vm.setTab = setTab;
    vm.clearData = clearData;

    function setTab(tab) {
      vm.tab = tab;
      $timeout(function() {
        vm.modal.modal('refresh');
      }, 10);
    }

    function clearData() {
      storageService.clearData()
        .then(function() {
          vm.dataCleared = 'Cleared!!!';
          $timeout(function() {
            vm.dataCleared = '';
          }, 3000);
        });
    }
  }

  function optionsDirective() {
    return {
      restrict: 'E',
      templateUrl: 'app/components/options/options.html',
      controller: 'OptionsCtrl',
      controllerAs: 'vm',
      bindToController: true,
      scope: {
        modal: "=psModal",
      },
      link: function(s, e, a, c) {
        var test = 2;
      },
    };
  }

})(angular);
