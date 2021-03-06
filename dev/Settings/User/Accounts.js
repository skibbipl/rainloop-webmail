
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Translator = require('Common/Translator'),
		Links = require('Common/Links'),

		AccountStore = require('Stores/User/Account'),
		IdentityStore = require('Stores/User/Identity'),

		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function AccountsUserSettings()
	{
		this.accounts = AccountStore.accounts;
		this.identities = IdentityStore.identities;

		this.processText = ko.computed(function () {
			return AccountStore.accounts.loading() ? Translator.i18n('SETTINGS_ACCOUNTS/LOADING_PROCESS') : '';
		}, this);

		this.visibility = ko.computed(function () {
			return '' === this.processText() ? 'hidden' : 'visible';
		}, this);

		this.accountForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.deleteAccess(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.deleteAccess(true);
				}
			}
		]});

		this.identityForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.deleteAccess(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.deleteAccess(true);
				}
			}
		]});
	}

	AccountsUserSettings.prototype.scrollableOptions = function ()
	{
		return {
			handle: '.drag-handle'
		};
	};

	AccountsUserSettings.prototype.addNewAccount = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Account'));
	};

	AccountsUserSettings.prototype.editAccount = function (oAccountItem)
	{
		if (oAccountItem && oAccountItem.canBeEdit())
		{
			require('Knoin/Knoin').showScreenPopup(require('View/Popup/Account'), [oAccountItem]);
		}
	};

	AccountsUserSettings.prototype.addNewIdentity = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Identity'));
	};

	AccountsUserSettings.prototype.editIdentity = function (oIdentity)
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Identity'), [oIdentity]);
	};

	/**
	 * @param {AccountModel} oAccountToRemove
	 */
	AccountsUserSettings.prototype.deleteAccount = function (oAccountToRemove)
	{
		if (oAccountToRemove && oAccountToRemove.deleteAccess())
		{
			this.accountForDeletion(null);

			var
				kn = require('Knoin/Knoin'),
				fRemoveAccount = function (oAccount) {
					return oAccountToRemove === oAccount;
				}
			;

			if (oAccountToRemove)
			{
				this.accounts.remove(fRemoveAccount);

				Remote.accountDelete(function (sResult, oData) {

					if (Enums.StorageResultType.Success === sResult && oData &&
						oData.Result && oData.Reload)
					{
						kn.routeOff();
						kn.setHash(Links.root(), true);
						kn.routeOff();

						_.defer(function () {
							window.location.reload();
						});
					}
					else
					{
						require('App/User').accountsAndIdentities();
					}

				}, oAccountToRemove.email);
			}
		}
	};

	/**
	 * @param {IdentityModel} oIdentityToRemove
	 */
	AccountsUserSettings.prototype.deleteIdentity = function (oIdentityToRemove)
	{
		if (oIdentityToRemove && oIdentityToRemove.deleteAccess())
		{
			this.identityForDeletion(null);

			if (oIdentityToRemove)
			{
				IdentityStore.identities.remove(function (oIdentity) {
					return oIdentityToRemove === oIdentity;
				});

				Remote.identityDelete(function () {
					require('App/User').accountsAndIdentities();
				}, oIdentityToRemove.id);
			}
		}
	};

	AccountsUserSettings.prototype.onBuild = function (oDom)
	{
		var self = this;

		oDom
			.on('click', '.accounts-list .account-item .e-action', function () {
				var oAccountItem = ko.dataFor(this);
				if (oAccountItem)
				{
					self.editAccount(oAccountItem);
				}
			})
			.on('click', '.identities-list .identity-item .e-action', function () {
				var oIdentityItem = ko.dataFor(this);
				if (oIdentityItem)
				{
					self.editIdentity(oIdentityItem);
				}
			})
		;
	};

	module.exports = AccountsUserSettings;

}());