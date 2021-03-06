
(function () {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Events = require('Common/Events'),
		Translator = require('Common/Translator'),

		AccountStore = require('Stores/User/Account'),
		SettingsStore = require('Stores/User/Settings'),

		Data = require('Storage/User/Data'),
		Cache = require('Storage/User/Cache'),

		AbstractScreen = require('Knoin/AbstractScreen')
	;

	/**
	 * @constructor
	 * @extends AbstractScreen
	 */
	function MailBoxUserScreen()
	{
		AbstractScreen.call(this, 'mailbox', [
			require('View/User/MailBox/SystemDropDown'),
			require('View/User/MailBox/FolderList'),
			require('View/User/MailBox/MessageList'),
			require('View/User/MailBox/MessageView')
		]);

		this.oLastRoute = {};
	}

	_.extend(MailBoxUserScreen.prototype, AbstractScreen.prototype);

	/**
	 * @type {Object}
	 */
	MailBoxUserScreen.prototype.oLastRoute = {};

	MailBoxUserScreen.prototype.setNewTitle  = function ()
	{
		var
			sEmail = AccountStore.email(),
			nFoldersInboxUnreadCount = Data.foldersInboxUnreadCount()
		;

		require('App/User').setTitle(('' === sEmail ? '' :
			(0 < nFoldersInboxUnreadCount ? '(' + nFoldersInboxUnreadCount + ') ' : ' ') +
				sEmail + ' - ') + Translator.i18n('TITLES/MAILBOX'));
	};

	MailBoxUserScreen.prototype.onShow = function ()
	{
		this.setNewTitle();
		Globals.keyScope(Enums.KeyState.MessageList);
	};

	/**
	 * @param {string} sFolderHash
	 * @param {number} iPage
	 * @param {string} sSearch
	 * @param {boolean=} bPreview = false
	 */
	MailBoxUserScreen.prototype.onRoute = function (sFolderHash, iPage, sSearch, bPreview)
	{
		if (Utils.isUnd(bPreview) ? false : !!bPreview)
		{
			if (Enums.Layout.NoPreview === SettingsStore.layout() && !Data.message())
			{
				require('App/User').historyBack();
			}
		}
		else
		{
			var
				sFolderFullNameRaw = Cache.getFolderFullNameRaw(sFolderHash),
				oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw)
			;

			if (oFolder)
			{
				Data
					.currentFolder(oFolder)
					.messageListPage(iPage)
					.messageListSearch(sSearch)
				;

				if (Enums.Layout.NoPreview === SettingsStore.layout() && Data.message())
				{
					Data.message(null);
				}

				require('App/User').reloadMessageList();
			}
		}
	};

	MailBoxUserScreen.prototype.onStart = function ()
	{
		Data.folderList.subscribe(Utils.windowResizeCallback);
		Data.messageList.subscribe(Utils.windowResizeCallback);
		Data.message.subscribe(Utils.windowResizeCallback);

		_.delay(function () {
			SettingsStore.layout.valueHasMutated();
		}, 50);

		Events.sub('mailbox.inbox-unread-count', function (iCount) {

			Data.foldersInboxUnreadCount(iCount);

			var sEmail = AccountStore.email();

			_.each(AccountStore.accounts(), function (oItem) {
				if (oItem && sEmail === oItem.email)
				{
					oItem.count(iCount);
				}
			});
		});

		Data.foldersInboxUnreadCount.subscribe(function () {
			this.setNewTitle();
		}, this);

	};

	MailBoxUserScreen.prototype.onBuild = function ()
	{
		if (!Globals.bMobileDevice)
		{
			_.defer(function () {
				require('App/User').initHorizontalLayoutResizer(Enums.ClientSideKeyName.MessageListSize);
			});
		}
	};

	/**
	 * @return {Array}
	 */
	MailBoxUserScreen.prototype.routes = function ()
	{
		var
			sInboxFolderName = Cache.getFolderInboxName(),
			fNormP = function () {
				return [sInboxFolderName, 1, '', true];
			},
			fNormS = function (oRequest, oVals) {
				oVals[0] = Utils.pString(oVals[0]);
				oVals[1] = Utils.pInt(oVals[1]);
				oVals[1] = 0 >= oVals[1] ? 1 : oVals[1];
				oVals[2] = Utils.pString(oVals[2]);

				if ('' === oRequest)
				{
					oVals[0] = sInboxFolderName;
					oVals[1] = 1;
				}

				return [decodeURI(oVals[0]), oVals[1], decodeURI(oVals[2]), false];
			},
			fNormD = function (oRequest, oVals) {
				oVals[0] = Utils.pString(oVals[0]);
				oVals[1] = Utils.pString(oVals[1]);

				if ('' === oRequest)
				{
					oVals[0] = sInboxFolderName;
				}

				return [decodeURI(oVals[0]), 1, decodeURI(oVals[1]), false];
			}
		;

		return [
			[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)\/(.+)\/?$/, {'normalize_': fNormS}],
			[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)$/, {'normalize_': fNormS}],
			[/^([a-zA-Z0-9]+)\/(.+)\/?$/, {'normalize_': fNormD}],
			[/^message-preview$/,  {'normalize_': fNormP}],
			[/^([^\/]*)$/,  {'normalize_': fNormS}]
		];
	};

	module.exports = MailBoxUserScreen;

}());