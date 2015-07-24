import Ember from 'ember';
import baseMixin from 'ember-data-offline/mixins/base';
import debug from 'ember-data-offline/utils/debug';
import extractTargetRecordFromPayload from 'ember-data-offline/utils/extract-online';
import { isExpiredOne, isExpiredMany, isExpiredAll } from 'ember-data-offline/utils/expired';
import { updateMeta } from 'ember-data-offline/utils/meta';

export default Ember.Mixin.create(baseMixin, {
  shouldReloadAll(store, snapshots) {
    let modelName = snapshots.type.modelName;
    let lastTime = this.get(`lastTimeFetched.all$${modelName}`);
    if (Ember.isEmpty(lastTime)) {
      return true;
    }
    let timeDelta = (lastTime - new Date()) / 1000 / 60 / 60;
    if (timeDelta > this.get('recordTTL')) {
      return true;
    }
    return false;
  },
  shouldBackgroundReloadAll: function() {
    return false;
  },
  shouldReloadRecord(store, snapshot) {
    let modelName = snapshot.type.modelName;
    let lastTime = this.get(`lastTimeFetched.one$${modelName}$${snapshot.id}`);
    if (Ember.isEmpty(lastTime)) {
      return true;
    }
    let timeDelta = (lastTime - new Date()) / 1000 / 60 / 60;
    if (timeDelta > this.get('recordTTL')) {
      return true;
    }
    return false;
  },
  shouldBackgroundReloadRecord() {
    return false;
  },

  metadataForType(typeClass) {
    return this._namespaceForType(typeClass).then(namespace => {
      return namespace["__data_offline_meta__"];
    });
  },

  findAll: function(store, typeClass, sinceToken, snapshots, fromJob) {
    debug('findAll offline', typeClass.modelName);
    return this._super.apply(this, arguments).then(records => {
      if (!fromJob) {
        //TODO find way to pass force reload option here
        this.metadataForType(typeClass).then(meta => {
          if (isExpiredAll(store, typeClass, meta)) {
            this.createOnlineJob('findAll', [store, typeClass, sinceToken, snapshots, true]);
          }
        });
      }
      return records;
    }).catch(console.log.bind(console));
  },

  find: function(store, typeClass, id, snapshot, fromJob) {
    return this._super.apply(this, arguments).then(record => {
      if (!fromJob) {
        if (isExpiredOne(store, typeClass, record) && !Ember.isEmpty(id)) {
          this.createOnlineJob('find', [store, typeClass, id, snapshot, true]);
        }
      }
      if (Ember.isEmpty(record) && !Ember.isEmpty(id)) {
        let primaryKey = store.serializerFor(typeClass.modelName).primaryKey;
        let stub = {};
        stub[primaryKey] = id;
        return stub;
      }
      return record;
    });
  },

  query: function(store, typeClass, query, recordArray, fromJob) {
    return this._super.apply(this, arguments).then(records => {
      //TODO think how to remove this dirty hasck
      if (Ember.isEmpty(records)) {
        return this.get('onlineAdapter').findQuery(store, typeClass, query, recordArray, fromJob).then(onlineRecords => {
          return extractTargetRecordFromPayload(store, typeClass, onlineRecords);
        });
      }
      else {
        if (!fromJob) {
          this.createOnlineJob('query', [store, typeClass, query, recordArray, true]);
        }
      }
      return records;
    }).catch(console.log.bind(console));
  },

  findMany: function(store, typeClass, ids, snapshots, fromJob) {
    // debug('findMany offline', type.modelName);
    return this._super.apply(this, arguments).then(records => {
      if (!fromJob) {
        if (isExpiredMany(store, typeClass, records) && !Ember.isEmpty(ids)) {
          this.createOnlineJob('findMany', [store, typeClass, ids, snapshots, true]);
        }
      }
      if (Ember.isEmpty(records) && !Ember.isEmpty(ids)) {
        let primaryKey = store.serializerFor(typeClass.modelName).primaryKey;
        return ids.map(id => {
          let stub = {};
          stub[primaryKey] = id;
          return stub;
        });
      }
      return records;
    });
  },

  createRecord(store, type, snapshot, fromJob) {
    updateMeta(snapshot);

    if (!fromJob) {
      if (this.get('isOnline')) {
        this.createOnlineJob('createRecord', [store, type, snapshot, true], `create$${type.modelName}`);
      }
      else {
        this.createOnlineJob('createRecord', [store, type, snapshot, true]);
      }
    }

    return this._super.apply(this, [store, type, snapshot]);
  },

  updateRecord(store, type, snapshot, fromJob) {
    if (!fromJob) {
      this.createOnlineJob('updateRecord', [store, type, snapshot, true]);
    }

    updateMeta(snapshot);
    return this._super.apply(this, [store, type, snapshot]);
  },

  deleteRecord(store, type, snapshot, fromJob) {
    if (!fromJob) {
      this.createOnlineJob('deleteRecord', [store, type, snapshot, true]);
    }
    return this._super.apply(this, arguments);
  }
});
